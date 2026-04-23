"""
Analyze how well win%, run diff/game, and Pythagorean win% at each snapshot
date predict (a) final win% and (b) remaining win% for that season.

Outputs:
  output/correlations.json  — R², RMSE, r per predictor/snapshot/target
  output/all_data.json      — correlations + raw snapshot rows (for viz)
"""

import csv
import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
OUTPUT_DIR = Path(__file__).parent / "output"

SNAPSHOTS = ["may_1", "jun_1", "jul_1", "aug_1", "sep_1"]
SNAPSHOT_LABELS = {
    "may_1": "May 1",
    "jun_1": "June 1",
    "jul_1": "July 1",
    "aug_1": "August 1",
    "sep_1": "September 1",
}

PREDICTORS = ["win_pct", "run_diff_per_game", "pythagorean_pct"]
PREDICTOR_LABELS = {
    "win_pct": "Win %",
    "run_diff_per_game": "Run Diff/G",
    "pythagorean_pct": "Pythagorean %",
}
TARGETS = ["final_win_pct", "remaining_win_pct"]
TARGET_LABELS = {
    "final_win_pct": "Final Win %",
    "remaining_win_pct": "Remaining Win %",
}


def _means(xs: list[float]) -> float:
    return sum(xs) / len(xs)


def pearson_r(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 3:
        return None
    mx, my = _means(xs), _means(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    denom_x = math.sqrt(sum((x - mx) ** 2 for x in xs))
    denom_y = math.sqrt(sum((y - my) ** 2 for y in ys))
    if denom_x == 0 or denom_y == 0:
        return None
    return num / (denom_x * denom_y)


def linear_rmse(xs: list[float], ys: list[float]) -> float:
    mx, my = _means(xs), _means(ys)
    ss_xx = sum((x - mx) ** 2 for x in xs)
    if ss_xx == 0:
        return float("nan")
    b1 = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / ss_xx
    b0 = my - b1 * mx
    preds = [b0 + b1 * x for x in xs]
    return math.sqrt(sum((p - a) ** 2 for p, a in zip(preds, ys)) / len(ys))


def load_rows() -> list[dict]:
    rows = []
    numeric = {
        "year", "wins", "losses", "games_played", "win_pct",
        "runs_scored", "runs_allowed", "run_diff", "run_diff_per_game",
        "pythagorean_pct", "final_wins", "final_losses", "final_games",
        "final_win_pct", "remaining_wins", "remaining_losses",
        "remaining_games", "remaining_win_pct",
    }
    with open(DATA_DIR / "snapshots.csv") as f:
        for row in csv.DictReader(f):
            for field in numeric:
                val = row.get(field)
                try:
                    row[field] = float(val) if val not in ("", "None", None) else None
                except (ValueError, TypeError):
                    row[field] = None
            if row.get("year") is not None:
                row["year"] = int(row["year"])
            rows.append(row)
    return rows


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    print(f"Loaded {len(rows)} snapshot rows")

    correlations: dict = {}

    for snap in SNAPSHOTS:
        snap_rows = [r for r in rows if r["snapshot"] == snap]
        correlations[snap] = {
            "label": SNAPSHOT_LABELS[snap],
            "n": len(snap_rows),
        }

        for target in TARGETS:
            correlations[snap][target] = {}
            for pred in PREDICTORS:
                pairs = [
                    (r[pred], r[target])
                    for r in snap_rows
                    if r[pred] is not None and r[target] is not None
                ]
                if len(pairs) < 10:
                    continue
                xs, ys = zip(*pairs)
                r = pearson_r(list(xs), list(ys))
                err = linear_rmse(list(xs), list(ys))
                correlations[snap][target][pred] = {
                    "label": PREDICTOR_LABELS[pred],
                    "r": round(r, 4) if r is not None else None,
                    "r2": round(r**2, 4) if r is not None else None,
                    "rmse": round(err, 4) if not math.isnan(err) else None,
                    "n": len(pairs),
                }

    with open(OUTPUT_DIR / "correlations.json", "w") as f:
        json.dump({"correlations": correlations}, f, indent=2)

    # Convert None values to null-safe strings for JSON serialization
    serializable_rows = [
        {k: v for k, v in r.items()} for r in rows
    ]
    with open(OUTPUT_DIR / "all_data.json", "w") as f:
        json.dump(
            {"correlations": correlations, "snapshots": serializable_rows},
            f,
            allow_nan=False,
            default=lambda x: None,
        )

    # Print summary table
    print("\n=== R² Summary: Predictor vs Final Win % ===\n")
    header = f"{'Snapshot':<12}  {'Win %':>8}  {'RunDiff/G':>10}  {'Pythagorean':>12}"
    print(header)
    print("-" * len(header))
    for snap in SNAPSHOTS:
        vs = correlations[snap].get("final_win_pct", {})
        wp  = vs.get("win_pct", {}).get("r2", "—")
        rd  = vs.get("run_diff_per_game", {}).get("r2", "—")
        py  = vs.get("pythagorean_pct", {}).get("r2", "—")
        print(f"{SNAPSHOT_LABELS[snap]:<12}  {str(wp):>8}  {str(rd):>10}  {str(py):>12}")

    print("\n=== R² Summary: Predictor vs Remaining Win % ===\n")
    print(header)
    print("-" * len(header))
    for snap in SNAPSHOTS:
        vs = correlations[snap].get("remaining_win_pct", {})
        wp  = vs.get("win_pct", {}).get("r2", "—")
        rd  = vs.get("run_diff_per_game", {}).get("r2", "—")
        py  = vs.get("pythagorean_pct", {}).get("r2", "—")
        print(f"{SNAPSHOT_LABELS[snap]:<12}  {str(wp):>8}  {str(rd):>10}  {str(py):>12}")

    print(f"\nOutputs written to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
