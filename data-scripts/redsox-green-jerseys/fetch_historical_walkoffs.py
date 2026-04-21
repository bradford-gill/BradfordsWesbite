"""
Fetch all MLB regular-season home wins from 2000–2024, detect walk-offs via
the linescore endpoint, and compute a league-wide baseline walk-off rate.

Writes:
  historical_walkoffs.csv   — per-season summary
  baseline_stats.json       — key numbers consumed by the blog component

Runtime: ~4–8 minutes (async, 30 concurrent requests).
"""

import asyncio
import csv
import json
import math
from pathlib import Path

import aiohttp
import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
SEASONS = list(range(2000, 2025))
CONCURRENCY = 30
OUT_DIR = Path(__file__).parent

GAMES_CSV = Path(__file__).parent / "games.csv"


def read_sox_stats() -> tuple[int, int]:
    """Read sox_wins and sox_walkoffs directly from the generated games CSV."""
    wins = 0
    walkoffs = 0
    with open(GAMES_CSV, newline="") as f:
        for row in csv.DictReader(f):
            if row["result"] == "W":
                wins += 1
                if row["walkoff"].strip() == "True":
                    walkoffs += 1
    return wins, walkoffs


# ── schedule ──────────────────────────────────────────────────────────────────


def fetch_season_schedule(year: int) -> list[dict]:
    """One sync call per season — returns all regular-season game stubs."""
    resp = requests.get(
        f"{BASE_URL}/schedule",
        params={"sportId": 1, "season": year, "gameType": "R"},
        timeout=30,
    )
    resp.raise_for_status()
    games = []
    for d in resp.json().get("dates", []):
        for g in d.get("games", []):
            games.append(g)
    return games


def home_wins(games: list[dict]) -> list[int]:
    """Return gamePks where the home team won and the score is known."""
    pks = []
    for g in games:
        if g.get("status", {}).get("abstractGameState") != "Final":
            continue
        home = g.get("teams", {}).get("home", {})
        away = g.get("teams", {}).get("away", {})
        if home.get("score") is None or away.get("score") is None:
            continue
        if home.get("isWinner"):
            pks.append(g["gamePk"])
    return pks


# ── async linescore fetching ──────────────────────────────────────────────────


async def fetch_linescore(
    session: aiohttp.ClientSession, game_pk: int, sem: asyncio.Semaphore
) -> tuple[int, dict]:
    async with sem:
        url = f"{BASE_URL}/game/{game_pk}/linescore"
        async with session.get(url) as resp:
            return game_pk, await resp.json()


def is_walkoff(linescore: dict) -> bool:
    home_runs = linescore.get("teams", {}).get("home", {}).get("runs", 0)
    away_runs = linescore.get("teams", {}).get("away", {}).get("runs", 0)
    if home_runs <= away_runs:
        return False
    innings = linescore.get("innings", [])
    if not innings:
        return False
    last = innings[-1]
    return "home" in last and "runs" in last["home"]


async def count_walkoffs(game_pks: list[int]) -> int:
    sem = asyncio.Semaphore(CONCURRENCY)
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)
    walkoffs = 0
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_linescore(session, pk, sem) for pk in game_pks]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                continue
            _, ls = r
            if is_walkoff(ls):
                walkoffs += 1
    return walkoffs


# ── binomial probability ──────────────────────────────────────────────────────


def prob_at_least_k(n: int, k: int, p: float) -> float:
    """P(X >= k) for X ~ Binomial(n, p)."""
    return sum(math.comb(n, i) * (p**i) * ((1 - p) ** (n - i)) for i in range(k, n + 1))


# ── main ──────────────────────────────────────────────────────────────────────


def main():
    SOX_WINS, SOX_WALKOFFS = read_sox_stats()
    print(
        f"Sox green jersey stats from CSV: {SOX_WALKOFFS} walkoffs in {SOX_WINS} wins"
    )

    season_rows: list[dict] = []
    total_home_wins = 0
    total_walkoffs = 0

    for year in SEASONS:
        print(f"  {year}  fetching schedule…", end="", flush=True)
        games = fetch_season_schedule(year)
        wins = home_wins(games)
        print(f" {len(wins)} home wins → checking linescores…", end="", flush=True)

        wos = asyncio.run(count_walkoffs(wins))
        rate = wos / len(wins) if wins else 0

        season_rows.append(
            {
                "season": year,
                "home_wins": len(wins),
                "walkoff_wins": wos,
                "walkoff_rate": round(rate, 4),
            }
        )
        total_home_wins += len(wins)
        total_walkoffs += wos
        print(f" {wos} walk-offs ({rate*100:.1f}%)")

    baseline_rate = total_walkoffs / total_home_wins if total_home_wins else 0
    expected = SOX_WINS * baseline_rate
    p_value = prob_at_least_k(SOX_WINS, SOX_WALKOFFS, baseline_rate)

    # Write season CSV
    csv_path = OUT_DIR / "historical_walkoffs.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["season", "home_wins", "walkoff_wins", "walkoff_rate"]
        )
        writer.writeheader()
        writer.writerows(season_rows)

    # Write stats JSON for the blog
    stats = {
        "seasons": f"{SEASONS[0]}–{SEASONS[-1]}",
        "total_home_wins": total_home_wins,
        "total_walkoff_wins": total_walkoffs,
        "baseline_walkoff_rate": round(baseline_rate, 4),
        "sox_wins": SOX_WINS,
        "sox_walkoffs": SOX_WALKOFFS,
        "sox_walkoff_rate": round(SOX_WALKOFFS / SOX_WINS, 4),
        "expected_walkoffs": round(expected, 2),
        "prob_at_least_sox_walkoffs": round(p_value, 6),
    }
    json_path = OUT_DIR / "baseline_stats.json"
    with open(json_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\n─── Baseline ───────────────────────────────────────")
    print(f"Seasons:              {stats['seasons']}")
    print(f"Total home wins:      {total_home_wins:,}")
    print(f"Total walk-offs:      {total_walkoffs:,}")
    print(f"Baseline rate:        {baseline_rate*100:.2f}%")
    print(f"\n─── Red Sox green jerseys ───────────────────────────")
    print(
        f"Walk-offs:            {SOX_WALKOFFS}/{SOX_WINS} wins ({SOX_WALKOFFS/SOX_WINS*100:.1f}%)"
    )
    print(f"Expected at baseline: {expected:.2f}")
    print(f"P(≥{SOX_WALKOFFS} walk-offs in {SOX_WINS} wins): {p_value*100:.4f}%")
    print(f"\nCSV → {csv_path}")
    print(f"JSON → {json_path}")


def quick_update():
    """Update only the Sox stats in baseline_stats.json without refetching history."""
    json_path = OUT_DIR / "baseline_stats.json"
    if not json_path.exists():
        print("baseline_stats.json not found — run without --quick first.")
        return
    with open(json_path) as f:
        stats = json.load(f)
    baseline_rate = stats["baseline_walkoff_rate"]
    sox_wins, sox_walkoffs = read_sox_stats()
    expected = sox_wins * baseline_rate
    p_value = prob_at_least_k(sox_wins, sox_walkoffs, baseline_rate)
    stats.update(
        {
            "sox_wins": sox_wins,
            "sox_walkoffs": sox_walkoffs,
            "sox_walkoff_rate": round(sox_walkoffs / sox_wins, 4),
            "expected_walkoffs": round(expected, 2),
            "prob_at_least_sox_walkoffs": round(p_value, 6),
        }
    )
    with open(json_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Updated baseline_stats.json: {sox_walkoffs} walkoffs in {sox_wins} wins")
    print(f"P(≥{sox_walkoffs} in {sox_wins}): {p_value*100:.4f}%")


if __name__ == "__main__":
    import sys

    if "--quick" in sys.argv:
        quick_update()
    else:
        main()
