#!/usr/bin/env bash
set -euo pipefail

# 1. Fetch MLB standings snapshots (2000-2025) at May 1, Jun 1, Jul 1, Aug 1, Sep 1, end-of-season
#    Raw API responses are cached in data/raw/ — safe to re-run, only fetches missing dates.
#    ~26 years × 6 dates × 30 teams ≈ 4,680 rows. First run takes ~5 min due to rate limiting.
uv run fetch_snapshots.py

# 2. Compute Pearson r, R², and RMSE for each predictor × target × snapshot date.
#    Outputs: output/correlations.json and output/all_data.json
uv run analyze.py
