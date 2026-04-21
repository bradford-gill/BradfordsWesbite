#!/usr/bin/env bash
set -euo pipefail

# 1. Fetch Red Sox green jersey Friday game data → games.csv
uv run main.py

# 2. Fetch MLB historical walk-off baseline (2000–2024) → historical_walkoffs.csv + baseline_stats.json
#    Takes ~4–8 minutes on first run.
uv run fetch_historical_walkoffs.py
