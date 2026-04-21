#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../../project/public/blog/redsox-green-jerseys"

echo "==> Fetching green jersey games..."
uv run "$SCRIPT_DIR/main.py"

echo ""
echo "==> Updating baseline stats..."
uv run "$SCRIPT_DIR/fetch_historical_walkoffs.py" --quick

echo ""
echo "==> Copying to public..."
cp "$SCRIPT_DIR/games.csv" "$PUBLIC_DIR/games.csv"
cp "$SCRIPT_DIR/baseline_stats.json" "$PUBLIC_DIR/baseline_stats.json"
cp "$SCRIPT_DIR/metadata.json" "$PUBLIC_DIR/metadata.json"

echo ""
echo "Done."
