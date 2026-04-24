"""
Fetch MLB standings at May 1 and end-of-season (2000-2025, excluding 2020).
Compute bucket-level outcome rates for actual win% and Pythagorean win%.

Pythagorean formula: RS^1.81 / (RS^1.81 + RA^1.81)

Outputs:
  output/may_start_data.json  — buckets + raw rows + current Red Sox data
"""

import json
import math
import sys
import time
from pathlib import Path

import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
RAW_DIR = Path(__file__).parent / "data" / "raw"
OUTPUT_DIR = Path(__file__).parent / "output"

YEARS = [y for y in range(2000, 2026) if y != 2020]
PYTH_EXP = 1.81
RED_SOX_ID = 111


def pythagorean_pct(rs: float, ra: float) -> float | None:
    if rs == 0 and ra == 0:
        return None
    denom = rs**PYTH_EXP + ra**PYTH_EXP
    return rs**PYTH_EXP / denom if denom > 0 else None


def fetch_standings(year: int, date: str | None = None) -> list[dict]:
    cache_key = date.replace("-", "") if date else "final"
    cache_file = RAW_DIR / f"{year}_{cache_key}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    params: dict = {
        "leagueId": "103,104",
        "season": str(year),
        "standingsType": "regularSeason",
        "hydrate": "team",
    }
    if date:
        params["date"] = date

    resp = requests.get(f"{BASE_URL}/standings", params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json().get("records", [])
    cache_file.write_text(json.dumps(data))
    time.sleep(0.15)
    return data


def extract_teams(records: list[dict]) -> dict[int, dict]:
    teams: dict[int, dict] = {}
    for division in records:
        for tr in division.get("teamRecords", []):
            team = tr.get("team", {})
            wins = int(tr.get("wins", 0))
            losses = int(tr.get("losses", 0))
            rs = int(tr.get("runsScored", 0))
            ra = int(tr.get("runsAllowed", 0))
            games = wins + losses
            team_id = team.get("id")
            if team_id is None:
                continue
            teams[team_id] = {
                "team_id": team_id,
                "team_name": team.get("name", ""),
                "team_abbr": team.get("abbreviation", ""),
                "wins": wins,
                "losses": losses,
                "games_played": games,
                "win_pct": round(wins / games, 4) if games > 0 else None,
                "runs_scored": rs,
                "runs_allowed": ra,
                "pythagorean_pct": (
                    round(p, 4) if (p := pythagorean_pct(rs, ra)) is not None else None
                ),
            }
    return teams


BUCKET_WIDTH = 0.02


def bucket_label(lower: float) -> str:
    return f"{int(round(lower * 100))}-{int(round((lower + BUCKET_WIDTH) * 100))}%"


def compute_buckets(rows: list[dict], pct_field: str) -> list[dict]:
    """Group rows into 2% win% buckets and compute outcome rates."""
    bucket_map: dict[float, list[dict]] = {}
    for row in rows:
        val = row.get(pct_field)
        if val is None:
            continue
        lower = math.floor(val / BUCKET_WIDTH) * BUCKET_WIDTH
        lower = round(lower, 3)
        bucket_map.setdefault(lower, []).append(row)

    buckets = []
    for lower in sorted(bucket_map.keys()):
        group = bucket_map[lower]
        n = len(group)
        final_wins = [r["final_wins"] for r in group if r.get("final_wins") is not None]
        if not final_wins:
            continue
        pct_90plus = sum(1 for w in final_wins if w >= 90) / len(final_wins)
        pct_81plus = sum(1 for w in final_wins if w >= 81) / len(final_wins)
        pct_sub81 = sum(1 for w in final_wins if w < 81) / len(final_wins)
        pct_sub70 = sum(1 for w in final_wins if w < 70) / len(final_wins)
        avg_pct = lower + BUCKET_WIDTH / 2
        buckets.append(
            {
                "label": bucket_label(lower),
                "lower": round(lower, 2),
                "mid": round(avg_pct, 3),
                "count": n,
                "pct_90plus": round(pct_90plus, 3),
                "pct_81plus": round(pct_81plus, 3),
                "pct_sub81": round(pct_sub81, 3),
                "pct_sub70": round(pct_sub70, 3),
            }
        )
    return buckets


def fetch_current_redsox() -> dict | None:
    """Fetch current 2026 Red Sox standings."""
    try:
        cache_file = RAW_DIR / "2026_current.json"
        if cache_file.exists():
            cached = json.loads(cache_file.read_text())
        else:
            resp = requests.get(
                f"{BASE_URL}/standings",
                params={
                    "leagueId": "103,104",
                    "season": "2026",
                    "standingsType": "regularSeason",
                    "hydrate": "team",
                },
                timeout=30,
            )
            resp.raise_for_status()
            cached = resp.json().get("records", [])
            cache_file.write_text(json.dumps(cached))

        teams = extract_teams(cached)
        sox = teams.get(RED_SOX_ID)
        return sox
    except Exception as e:
        print(f"  Warning: could not fetch current Red Sox data: {e}", file=sys.stderr)
        return None


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []

    for year in YEARS:
        print(f"\n{year}", flush=True)
        may1_date = f"{year}-05-01"

        print(f"  May 1 ...", end=" ", flush=True)
        try:
            may1_records = fetch_standings(year, may1_date)
            may1_teams = extract_teams(may1_records)
            print(f"{len(may1_teams)} teams")
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            continue

        print(f"  End of season ...", end=" ", flush=True)
        try:
            final_records = fetch_standings(year)
            final_teams = extract_teams(final_records)
            print(f"{len(final_teams)} teams")
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            continue

        for team_id, snap in may1_teams.items():
            final = final_teams.get(team_id)
            if final is None:
                continue
            rows.append(
                {
                    "year": year,
                    "team_id": snap["team_id"],
                    "team_name": snap["team_name"],
                    "team_abbr": snap["team_abbr"],
                    "wins": snap["wins"],
                    "losses": snap["losses"],
                    "games_played": snap["games_played"],
                    "win_pct": snap["win_pct"],
                    "runs_scored": snap["runs_scored"],
                    "runs_allowed": snap["runs_allowed"],
                    "pythagorean_pct": snap["pythagorean_pct"],
                    "final_wins": final["wins"],
                    "final_losses": final["losses"],
                    "final_win_pct": final["win_pct"],
                }
            )

    print(f"\nTotal rows: {len(rows)}")

    buckets_by_win_pct = compute_buckets(rows, "win_pct")
    buckets_by_pyth_pct = compute_buckets(rows, "pythagorean_pct")

    print(f"\nBuckets (actual win%): {len(buckets_by_win_pct)}")
    for b in buckets_by_win_pct:
        print(
            f"  {b['label']:>10}  n={b['count']:>3}  90+={b['pct_90plus']:.1%}  81+={b['pct_81plus']:.1%}  <81={b['pct_sub81']:.1%}  <70={b['pct_sub70']:.1%}"
        )

    print(f"\nBuckets (Pythagorean%): {len(buckets_by_pyth_pct)}")
    for b in buckets_by_pyth_pct:
        print(
            f"  {b['label']:>10}  n={b['count']:>3}  90+={b['pct_90plus']:.1%}  81+={b['pct_81plus']:.1%}  <81={b['pct_sub81']:.1%}  <70={b['pct_sub70']:.1%}"
        )

    print("\nFetching current 2026 Red Sox ...", end=" ", flush=True)
    redsox_current = fetch_current_redsox()
    if redsox_current:
        print(f"{redsox_current['wins']}-{redsox_current['losses']}")
    else:
        print("not available")

    output = {
        "buckets_by_win_pct": buckets_by_win_pct,
        "buckets_by_pyth_pct": buckets_by_pyth_pct,
        "raw_rows": rows,
        "redsox_2026": redsox_current,
        "meta": {
            "years": YEARS,
            "pyth_exp": PYTH_EXP,
            "total_team_seasons": len(rows),
        },
    }

    out_file = OUTPUT_DIR / "may_start_data.json"
    with open(out_file, "w") as f:
        json.dump(output, f, indent=2, default=lambda x: None)

    print(f"\nWrote {out_file}")


if __name__ == "__main__":
    main()
