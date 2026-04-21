#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> project: npm run format"
(cd "$ROOT/project" && npm run format)

echo "==> data-scripts: black"
(cd "$ROOT/data-scripts" && uv tool run black .)

echo "Done."