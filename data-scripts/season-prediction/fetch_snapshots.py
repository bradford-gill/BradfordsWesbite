"""
Fetch MLB standings snapshots at 6 key dates per season (2000-2025):
  May 1, Jun 1, Jul 1, Aug 1, Sep 1, end-of-season (~Oct 5).

For each team/snapshot: wins, losses, runs scored, runs allowed, run diff,
win%, and Pythagorean win% (RS^1.83 / (RS^1.83 + RA^1.83)).

Raw API responses are cached in data/raw/ so re-runs are instant.
Output: data/snapshots.csv
"""

import csv
import json
import sys
import time
from pathlib import Path

import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "raw"
OUTPUT_CSV = DATA_DIR / "snapshots.csv"

YEARS = range(2000, 2026)

# "end" uses None → no date param in API call, which returns the final season standings
SNAPSHOT_DATES: dict[str, str | None] = {
    "may_1": "05-01",
    "jun_1": "06-01",
    "jul_1": "07-01",
    "aug_1": "08-01",
    "sep_1": "09-01",
    "end": None,
}

PYTH_EXP = 1.83


def pythagorean_pct(rs: float, ra: float) -> float | None:
    if rs == 0 and ra == 0:
        return None
    denom = rs**PYTH_EXP + ra**PYTH_EXP
    return rs**PYTH_EXP / denom if denom > 0 else None


def fetch_standings(year: int, date: str | None) -> list[dict]:
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
                "run_diff": rs - ra,
                "run_diff_per_game": round((rs - ra) / games, 4) if games > 0 else None,
                "pythagorean_pct": round(p, 4)
                if (p := pythagorean_pct(rs, ra)) is not None
                else None,
            }
    return teams


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    all_rows: list[dict] = []
    snap_keys = list(SNAPSHOT_DATES.keys())
    mid_snaps = snap_keys[:-1]  # everything except "end"

    for year in YEARS:
        print(f"\n{year}", flush=True)
        year_data: dict[str, dict[int, dict]] = {}

        for snap_key, date_suffix in SNAPSHOT_DATES.items():
            date = f"{year}-{date_suffix}" if date_suffix else None
            label = date or "final"
            print(f"  {snap_key} ({label})", end=" ... ", flush=True)
            try:
                records = fetch_standings(year, date)
                year_data[snap_key] = extract_teams(records)
                print(f"{len(year_data[snap_key])} teams")
            except Exception as exc:
                print(f"ERROR: {exc}", file=sys.stderr)
                year_data[snap_key] = {}

        end_teams = year_data.get("end", {})

        for snap_key in mid_snaps:
            date_suffix = SNAPSHOT_DATES[snap_key] or ""
            snap_teams = year_data.get(snap_key, {})

            for team_id, snap in snap_teams.items():
                final = end_teams.get(team_id)
                if final is None:
                    continue

                rem_wins = max(final["wins"] - snap["wins"], 0)
                rem_losses = max(final["losses"] - snap["losses"], 0)
                rem_games = rem_wins + rem_losses

                all_rows.append(
                    {
                        "year": year,
                        "team_id": snap["team_id"],
                        "team_name": snap["team_name"],
                        "team_abbr": snap["team_abbr"],
                        "snapshot": snap_key,
                        "snapshot_date": f"{year}-{date_suffix}",
                        # snapshot stats
                        "wins": snap["wins"],
                        "losses": snap["losses"],
                        "games_played": snap["games_played"],
                        "win_pct": snap["win_pct"],
                        "runs_scored": snap["runs_scored"],
                        "runs_allowed": snap["runs_allowed"],
                        "run_diff": snap["run_diff"],
                        "run_diff_per_game": snap["run_diff_per_game"],
                        "pythagorean_pct": snap["pythagorean_pct"],
                        # end-of-season
                        "final_wins": final["wins"],
                        "final_losses": final["losses"],
                        "final_games": final["games_played"],
                        "final_win_pct": final["win_pct"],
                        # remaining after snapshot
                        "remaining_wins": rem_wins,
                        "remaining_losses": rem_losses,
                        "remaining_games": rem_games,
                        "remaining_win_pct": round(rem_wins / rem_games, 4)
                        if rem_games > 0
                        else None,
                    }
                )

    if not all_rows:
        print("No rows collected — check API connectivity.")
        sys.exit(1)

    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(all_rows[0].keys()))
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\nWrote {len(all_rows)} rows → {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
