#!/bin/bash
# Usage: tools/f_runqueue.sh <outDir> url1 url2 ...   (runs analyze.mjs 2 at a time)
cd "$(dirname "$0")/.."
OUT="$1"; shift
run() { node tools/analyze.mjs "$1" "$OUT" 2>&1 | tail -1; }
while [ $# -gt 0 ]; do
  a="$1"; shift; b="$1"; [ $# -gt 0 ] && shift
  run "$a" & p1=$!
  if [ -n "$b" ]; then run "$b" & p2=$!; wait $p2; fi
  wait $p1
done
echo QUEUE_DONE
