#!/usr/bin/env bash
set -euo pipefail

# 1. Download Statcast pitch data (2021-2024) and StatsAPI pitcher game logs.
#    Raw data is cached in data/raw/ — re-runs skip already-fetched weeks/pitchers.
#    First run: ~30 min (Savant throttle) + ~10 min (StatsAPI).
uv run fetch.py

# 2. Build outings → experiment table → correlations.
#    Intermediate parquets cached in data/; re-runs skip already-built tables.
uv run analyze.py
