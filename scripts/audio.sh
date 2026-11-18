#!/usr/bin/env bash
# Runs the free edge-tts Bangla audio generator.
# Prefers a project virtualenv (.venv) if present, else system python3.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -x ".venv/bin/python" ]; then
  PY=".venv/bin/python"
else
  PY="python3"
fi

exec "$PY" scripts/generate_audio.py "$@"
