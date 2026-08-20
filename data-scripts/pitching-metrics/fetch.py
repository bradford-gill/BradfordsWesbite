# Step 1: Fetch Statcast pitch data from Baseball Savant (regular season 2021-2026).
#         Fetches in 3-day batches (safe under 25k cap), 2 parallel workers.
#         Caches one parquet per calendar day in data/raw/savant/YYYY-MM-DD.parquet.
#         Output: data/pitches.parquet
#
# Step 2: Fetch per-pitcher game logs from MLB StatsAPI (regular season).
#         Cache per-pitcher-year JSON in data/raw/gamelogs/.
#         Output: data/gamelogs.parquet
#
# Step 3: Fetch postseason Savant data (2021-2025, all playoff rounds).
#         One request per year (small volume, no batching needed).
#         Cache per year in data/raw/savant_post/YYYY.parquet.
#         Output: data/pitches_post.parquet
#
# Step 4: Fetch postseason game logs from StatsAPI (Wild Card, DS, LCS, WS).
#         Cache per-pitcher-year-round JSON in data/raw/gamelogs/.
#         Output: data/gamelogs_post.parquet
#
# Ctrl+C to pause — cached days/years are skipped on resume.

import datetime
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
from tqdm import tqdm

YEARS = range(2021, 2027)  # regular season
POST_YEARS = range(2021, 2026)  # postseason (2026 hasn't happened)

CUTOFF_2026 = datetime.date.today() - datetime.timedelta(days=2)
BATCH_DAYS = 3
MAX_WORKERS = 2

DATA_DIR = Path(__file__).parent / "data"
SAVANT_RAW = DATA_DIR / "raw" / "savant"
SAVANT_POST_RAW = DATA_DIR / "raw" / "savant_post"
GAMELOG_RAW = DATA_DIR / "raw" / "gamelogs"

PITCHES_OUT = DATA_DIR / "pitches.parquet"
GAMELOGS_OUT = DATA_DIR / "gamelogs.parquet"
PITCHES_POST_OUT = DATA_DIR / "pitches_post.parquet"
GAMELOGS_POST_OUT = DATA_DIR / "gamelogs_post.parquet"

SAVANT_URL = "https://baseballsavant.mlb.com/statcast_search/csv"
STATSAPI_URL = "https://statsapi.mlb.com/api/v1"
SAVANT_ROW_CAP = 25_000

SAVANT_COLS = [
    "game_pk",
    "game_date",
    "pitcher",
    "events",
    "description",
    "bb_type",
    "woba_value",
    "woba_denom",
    "estimated_woba_using_speedangle",
]

POST_GAME_TYPES = ["F", "D", "L", "W"]  # Wild Card, Division Series, LCS, World Series


# ── Savant regular season ─────────────────────────────────────────────────────


def _get_savant(start: str, end: str, hf_gt: str = "R|") -> pd.DataFrame:
    params = {
        "all": "true",
        "game_date_gt": start,
        "game_date_lt": end,
        "player_type": "pitcher",
        "hfGT": hf_gt,
        "type": "details",
        "min_pitches": 0,
        "min_results": 0,
        "min_pas": 0,
    }
    for attempt in range(5):
        try:
            resp = requests.get(SAVANT_URL, params=params, timeout=120)
            resp.raise_for_status()
            body = resp.text.strip()
            if not body or body.startswith("Error") or body.startswith("<!"):
                return pd.DataFrame(columns=SAVANT_COLS)
            df = pd.read_csv(StringIO(body), low_memory=False)
            keep = [c for c in SAVANT_COLS if c in df.columns]
            return df[keep].copy()
        except requests.exceptions.RequestException:
            time.sleep(2**attempt * 5)
    return pd.DataFrame(columns=SAVANT_COLS)


def fetch_batch(dates: list[str]) -> tuple[list[str], int]:
    caches = [SAVANT_RAW / f"{d}.parquet" for d in dates]
    missing = [d for d, c in zip(dates, caches) if not c.exists()]

    fetched = 0
    if missing:
        start = missing[0]
        end = str(datetime.date.fromisoformat(missing[-1]) + datetime.timedelta(days=1))
        df = _get_savant(start, end)

        if len(df) == SAVANT_ROW_CAP:
            df = pd.DataFrame(columns=SAVANT_COLS)
            for d in missing:
                nxt = str(datetime.date.fromisoformat(d) + datetime.timedelta(days=1))
                day_df = _get_savant(d, nxt)
                if len(day_df) == SAVANT_ROW_CAP:
                    raise RuntimeError(
                        f"Hit 25k cap on a single day ({d}) — investigate"
                    )
                day_df.to_parquet(SAVANT_RAW / f"{d}.parquet", index=False)
                fetched += len(day_df)
                df = pd.concat([df, day_df], ignore_index=True)
        else:
            if not df.empty and "game_date" in df.columns:
                for d in missing:
                    day_df = df[df["game_date"].astype(str) == d]
                    day_df.to_parquet(SAVANT_RAW / f"{d}.parquet", index=False)
            else:
                for d in missing:
                    pd.DataFrame(columns=SAVANT_COLS).to_parquet(
                        SAVANT_RAW / f"{d}.parquet", index=False
                    )
            fetched = len(df)

        time.sleep(0.3)

    return dates, fetched


def season_end(year: int) -> datetime.date:
    return CUTOFF_2026 if year == 2026 else datetime.date(year, 10, 15)


def all_batches() -> list[list[str]]:
    batches, cur_batch = [], []
    for year in YEARS:
        cur = datetime.date(year, 3, 28)
        end = season_end(year)
        while cur <= end:
            cur_batch.append(str(cur))
            if len(cur_batch) == BATCH_DAYS:
                batches.append(cur_batch)
                cur_batch = []
            cur += datetime.timedelta(days=1)
        if cur_batch:
            batches.append(cur_batch)
            cur_batch = []
    return batches


def build_pitches() -> pd.DataFrame:
    SAVANT_RAW.mkdir(parents=True, exist_ok=True)
    batches = all_batches()
    cached_batches = sum(
        1 for b in batches if all((SAVANT_RAW / f"{d}.parquet").exists() for d in b)
    )
    tqdm.write(
        f"Savant: {len(batches)} batches ({BATCH_DAYS} days each), {cached_batches} fully cached, {MAX_WORKERS} workers"
    )

    pitch_total = 0
    with tqdm(total=len(batches), unit="batch", desc="Savant") as bar:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {pool.submit(fetch_batch, b): b for b in batches}
            for future in as_completed(futures):
                dates, fetched = future.result()
                pitch_total += fetched
                year = dates[0][:4]
                bar.set_description(f"Savant {year}")
                bar.set_postfix(fetched=f"{pitch_total:,}", batch=dates[0])
                bar.update(1)

    tqdm.write("Loading daily parquets…")
    frames = [
        pd.read_parquet(f)
        for yr in YEARS
        for f in sorted(SAVANT_RAW.glob(f"{yr}-??-??.parquet"))
    ]
    pitches = pd.concat(frames, ignore_index=True)
    pitches["game_date"] = pd.to_datetime(pitches["game_date"])
    pitches["game_pk"] = pitches["game_pk"].astype("Int64")
    pitches["pitcher"] = pitches["pitcher"].astype("Int64")
    pitches = pitches.drop_duplicates()
    pitches.to_parquet(PITCHES_OUT, index=False)
    tqdm.write(f"{len(pitches):,} pitches → {PITCHES_OUT}")
    return pitches


# ── Savant postseason ─────────────────────────────────────────────────────────


def fetch_postseason_savant(year: int) -> pd.DataFrame:
    cache = SAVANT_POST_RAW / f"{year}.parquet"
    if cache.exists():
        return pd.read_parquet(cache)

    start = f"{year}-10-01"
    end = f"{year}-11-15"
    df = _get_savant(start, end, hf_gt="F|D|L|W|")
    df.to_parquet(cache, index=False)
    tqdm.write(f"Postseason {year}: {len(df):,} pitches")
    time.sleep(0.5)
    return df


def build_pitches_post() -> pd.DataFrame:
    SAVANT_POST_RAW.mkdir(parents=True, exist_ok=True)
    frames = []
    with tqdm(total=len(POST_YEARS), unit="year", desc="Savant postseason") as bar:
        for year in POST_YEARS:
            frames.append(fetch_postseason_savant(year))
            bar.update(1)
    pitches_post = pd.concat(frames, ignore_index=True)
    pitches_post["game_date"] = pd.to_datetime(pitches_post["game_date"])
    pitches_post["game_pk"] = pitches_post["game_pk"].astype("Int64")
    pitches_post["pitcher"] = pitches_post["pitcher"].astype("Int64")
    pitches_post = pitches_post.drop_duplicates()
    pitches_post.to_parquet(PITCHES_POST_OUT, index=False)
    tqdm.write(f"{len(pitches_post):,} postseason pitches → {PITCHES_POST_OUT}")
    return pitches_post


# ── StatsAPI regular season game logs ─────────────────────────────────────────


def parse_ip(ip_str: str) -> float:
    parts = str(ip_str).split(".")
    return int(parts[0]) + (int(parts[1]) if len(parts) > 1 and parts[1] else 0) / 3


def _statsapi_get(url: str, params: dict) -> requests.Response | None:
    for attempt in range(5):
        try:
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            return resp
        except requests.exceptions.RequestException:
            time.sleep(2**attempt * 3)
    return None


def fetch_gamelog(pitcher_id: int, year: int) -> list[dict]:
    cache = GAMELOG_RAW / f"{pitcher_id}_{year}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    url = f"{STATSAPI_URL}/people/{pitcher_id}/stats"
    params = {
        "stats": "gameLog",
        "group": "pitching",
        "season": str(year),
        "gameType": "R",
    }
    resp = _statsapi_get(url, params)
    rows = []
    if resp is not None:
        for s in (resp.json().get("stats") or [{}])[0].get("splits", []):
            stat, game = s.get("stat", {}), s.get("game", {})
            rows.append(
                {
                    "pitcher_id": pitcher_id,
                    "game_pk": game.get("gamePk"),
                    "game_date": s.get("date"),
                    "IP": parse_ip(stat.get("inningsPitched", "0.0")),
                    "ER": int(stat.get("earnedRuns", 0)),
                    "SO": int(stat.get("strikeOuts", 0)),
                    "BB": int(stat.get("baseOnBalls", 0)),
                    "HBP": int(stat.get("hitBatsmen", 0)),
                    "HR": int(stat.get("homeRuns", 0)),
                }
            )
    cache.write_text(json.dumps(rows))
    time.sleep(0.1)
    return rows


def build_gamelogs(pitcher_ids: list[int]) -> pd.DataFrame:
    GAMELOG_RAW.mkdir(parents=True, exist_ok=True)
    pairs = [(pid, yr) for pid in pitcher_ids for yr in YEARS]
    all_rows = []
    with tqdm(total=len(pairs), unit="pitcher-yr", desc="StatsAPI regular") as bar:
        for pid, year in pairs:
            all_rows.extend(fetch_gamelog(pid, year))
            bar.update(1)
    df = pd.DataFrame(all_rows)
    df["game_date"] = pd.to_datetime(df["game_date"])
    df.to_parquet(GAMELOGS_OUT, index=False)
    tqdm.write(f"{len(df):,} pitcher-game rows → {GAMELOGS_OUT}")
    return df


# ── StatsAPI postseason game logs ─────────────────────────────────────────────


def fetch_gamelog_post(pitcher_id: int, year: int) -> list[dict]:
    cache = GAMELOG_RAW / f"{pitcher_id}_{year}_post.json"
    if cache.exists():
        return json.loads(cache.read_text())
    rows = []
    for gt in POST_GAME_TYPES:
        url = f"{STATSAPI_URL}/people/{pitcher_id}/stats"
        params = {
            "stats": "gameLog",
            "group": "pitching",
            "season": str(year),
            "gameType": gt,
        }
        resp = _statsapi_get(url, params)
        if resp is not None:
            for s in (resp.json().get("stats") or [{}])[0].get("splits", []):
                stat, game = s.get("stat", {}), s.get("game", {})
                rows.append(
                    {
                        "pitcher_id": pitcher_id,
                        "game_pk": game.get("gamePk"),
                        "game_date": s.get("date"),
                        "game_type": gt,
                        "IP": parse_ip(stat.get("inningsPitched", "0.0")),
                        "ER": int(stat.get("earnedRuns", 0)),
                        "SO": int(stat.get("strikeOuts", 0)),
                        "BB": int(stat.get("baseOnBalls", 0)),
                        "HBP": int(stat.get("hitBatsmen", 0)),
                        "HR": int(stat.get("homeRuns", 0)),
                    }
                )
        time.sleep(0.05)
    cache.write_text(json.dumps(rows))
    time.sleep(0.1)
    return rows


def build_gamelogs_post(pitcher_ids: list[int]) -> pd.DataFrame:
    GAMELOG_RAW.mkdir(parents=True, exist_ok=True)
    pairs = [(pid, yr) for pid in pitcher_ids for yr in POST_YEARS]
    all_rows = []
    with tqdm(total=len(pairs), unit="pitcher-yr", desc="StatsAPI postseason") as bar:
        for pid, year in pairs:
            all_rows.extend(fetch_gamelog_post(pid, year))
            bar.update(1)
    df = pd.DataFrame(all_rows)
    if not df.empty:
        df["game_date"] = pd.to_datetime(df["game_date"])
    df.to_parquet(GAMELOGS_POST_OUT, index=False)
    tqdm.write(f"{len(df):,} postseason pitcher-game rows → {GAMELOGS_POST_OUT}")
    return df


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    try:
        # ── Regular season pitches ──
        rebuild_pitches = False
        if PITCHES_OUT.exists():
            pitches = pd.read_parquet(PITCHES_OUT)
            earliest = pitches["game_date"].dt.year.min()
            if earliest > min(YEARS):
                tqdm.write(
                    f"Pitches cached from {earliest} only — rebuilding for {min(YEARS)}+"
                )
                PITCHES_OUT.unlink()
                rebuild_pitches = True
            else:
                tqdm.write(f"Pitches cached — loading {PITCHES_OUT}")
        else:
            rebuild_pitches = True

        if rebuild_pitches:
            pitches = build_pitches()

        pitcher_ids = pitches["pitcher"].dropna().astype(int).unique().tolist()
        tqdm.write(f"{len(pitcher_ids):,} unique pitchers (regular season)")

        # ── Regular season game logs ──
        rebuild_gamelogs = False
        if GAMELOGS_OUT.exists():
            gl = pd.read_parquet(GAMELOGS_OUT)
            earliest_gl = gl["game_date"].dt.year.min()
            if earliest_gl > min(YEARS):
                tqdm.write(
                    f"Game logs cached from {earliest_gl} only — rebuilding for {min(YEARS)}+"
                )
                GAMELOGS_OUT.unlink()
                rebuild_gamelogs = True
            else:
                tqdm.write(f"Game logs cached — {GAMELOGS_OUT}")
        else:
            rebuild_gamelogs = True

        if rebuild_gamelogs:
            tqdm.write("Fetching StatsAPI regular season game logs…")
            build_gamelogs(pitcher_ids)

        # ── Postseason pitches ──
        if PITCHES_POST_OUT.exists():
            tqdm.write(f"Postseason pitches cached — {PITCHES_POST_OUT}")
            pitches_post = pd.read_parquet(PITCHES_POST_OUT)
        else:
            tqdm.write("Fetching postseason Savant data…")
            pitches_post = build_pitches_post()

        post_pitcher_ids = (
            pitches_post["pitcher"].dropna().astype(int).unique().tolist()
        )
        tqdm.write(f"{len(post_pitcher_ids):,} unique pitchers (postseason)")

        # ── Postseason game logs ──
        if GAMELOGS_POST_OUT.exists():
            tqdm.write(f"Postseason game logs cached — {GAMELOGS_POST_OUT}")
        else:
            tqdm.write("Fetching StatsAPI postseason game logs…")
            build_gamelogs_post(post_pitcher_ids)

    except KeyboardInterrupt:
        tqdm.write("\nInterrupted — progress saved. Re-run to resume.")


if __name__ == "__main__":
    main()
