#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"
mkdir -p work/audio-logs assets/audio

pids=()
for shard in 0 1 2 3; do
  work/kokoro-venv/bin/python scripts/generate-kokoro-audio.py --only all --shard-index "$shard" --shard-count 4 > "work/audio-logs/shard-$shard.log" 2>&1 &
  pids+=("$!")
done

for pid in "${pids[@]}"; do
  wait "$pid"
done

work/kokoro-venv/bin/python scripts/generate-kokoro-audio.py --only manifest
node scripts/build-audio-assets.mjs
npm run check
date -u +%FT%TZ > assets/audio/.complete
