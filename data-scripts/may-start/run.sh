#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
uv run python fetch_and_analyze.py
cp output/may_start_data.json ../../../project/public/blog/may-start/may_start_data.json
echo "Done. Data copied to project/public/blog/may-start/"
