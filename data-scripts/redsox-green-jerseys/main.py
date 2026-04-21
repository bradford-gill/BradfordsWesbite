"""
Fetch Red Sox Friday home games (green jersey Fridays) from the MLB Stats API
for 2025 and 2026, detect walk-offs, and write results to CSV.
"""

import csv
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
RED_SOX_ID = 111
OUTPUT_CSV = Path(__file__).parent / "games.csv"
METADATA_JSON = Path(__file__).parent / "metadata.json"


def get_schedule(start_date: str, end_date: str) -> list[dict]:
    resp = requests.get(
        f"{BASE_URL}/schedule",
        params={
            "teamId": RED_SOX_ID,
            "startDate": start_date,
            "endDate": end_date,
            "sportId": 1,
            "gameType": "R",
        },
    )
    resp.raise_for_status()
    games = []
    for date_entry in resp.json().get("dates", []):
        for game in date_entry.get("games", []):
            games.append(game)
    return games


def is_friday_home_game(game: dict) -> bool:
    game_date_str = game.get("gameDate", "")
    if not game_date_str:
        return False
    # Game times are UTC; subtract 4h (EDT) to get local date for day-of-week check
    game_dt = datetime.strptime(game_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=timezone.utc
    )
    local_dt = game_dt - timedelta(hours=4)
    if local_dt.weekday() != 4:  # 4 = Friday
        return False
    home_team_id = game.get("teams", {}).get("home", {}).get("team", {}).get("id")
    return home_team_id == RED_SOX_ID


def is_game_final(game: dict) -> bool:
    return game.get("status", {}).get("abstractGameState") == "Final"


def get_linescore(game_pk: int) -> dict:
    resp = requests.get(f"{BASE_URL}/game/{game_pk}/linescore")
    resp.raise_for_status()
    return resp.json()


def detect_walkoff(linescore: dict) -> bool:
    """
    Walk-off: home team won AND batted in the final inning.
    The innings array only includes played half-innings; if the last inning
    has a 'home' key the home team batted last, which is the walk-off condition.
    """
    home_runs = linescore.get("teams", {}).get("home", {}).get("runs", 0)
    away_runs = linescore.get("teams", {}).get("away", {}).get("runs", 0)
    if home_runs <= away_runs:
        return False
    innings = linescore.get("innings", [])
    if not innings:
        return False
    last_inning = innings[-1]
    return "home" in last_inning and "runs" in last_inning["home"]


def main():
    today = datetime.now().strftime("%Y-%m-%d")
    # MLB Stats API paginates by season, so query each season separately
    print(f"Fetching 2025 season…")
    games_2025 = get_schedule("2025-03-27", "2025-11-30")
    print(f"Fetching 2026 season through {today}…")
    games_2026 = get_schedule("2026-03-27", today)
    games = games_2025 + games_2026
    print(f"  Total Red Sox games fetched: {len(games)}")

    friday_home_games = [
        g for g in games
        if is_friday_home_game(g)
        and is_game_final(g)
        and g.get("teams", {}).get("home", {}).get("score") is not None
        and g.get("teams", {}).get("away", {}).get("score") is not None
    ]
    print(f"  Friday home games (final):   {len(friday_home_games)}")

    rows = []
    for game in friday_home_games:
        game_pk = game["gamePk"]
        game_date_str = game["gameDate"]
        game_dt = datetime.strptime(game_date_str, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        date_local = (game_dt - timedelta(hours=4)).strftime("%Y-%m-%d")

        home = game["teams"]["home"]
        away_team = game["teams"]["away"]["team"]["name"]
        home_score = home.get("score", 0)
        away_score = game["teams"]["away"].get("score", 0)
        result = "W" if home.get("isWinner") else "L"

        linescore = get_linescore(game_pk)
        walkoff = detect_walkoff(linescore) if result == "W" else False
        innings_played = linescore.get("currentInning", 9)

        rows.append({
            "date": date_local,
            "opponent": away_team,
            "result": result,
            "sox_score": home_score,
            "opp_score": away_score,
            "innings": innings_played,
            "walkoff": walkoff,
            "game_pk": game_pk,
        })

        print(f"  {date_local}  vs {away_team:<30} {result}  {home_score}-{away_score}  {'WALKOFF' if walkoff else ''}")
        time.sleep(0.1)

    fieldnames = ["date", "opponent", "result", "sox_score", "opp_score", "innings", "walkoff", "game_pk"]
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with open(METADATA_JSON, "w") as f:
        json.dump({"last_refreshed": datetime.now(timezone.utc).strftime("%Y-%m-%d")}, f)

    total = len(rows)
    wins = sum(1 for r in rows if r["result"] == "W")
    losses = total - wins
    walkoffs = sum(1 for r in rows if r["walkoff"])
    walkoff_pct = walkoffs / total * 100 if total else 0
    walkoff_of_wins = walkoffs / wins * 100 if wins else 0

    print(f"\n--- Summary ---")
    print(f"Record:          {wins}-{losses}  ({wins/total*100:.1f}% win rate)")
    print(f"Walk-offs:       {walkoffs}/{total} games ({walkoff_pct:.1f}%)")
    print(f"Walk-offs/wins:  {walkoffs}/{wins} wins ({walkoff_of_wins:.1f}%)")
    print(f"CSV written to:  {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
