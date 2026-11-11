#!/bin/sh
# 用法：sheet.sh <名字> <帧号,帧号,...>  把指定帧拼成 3 列联系表，便于查看
set -e
WORK="$(cd "$(dirname "$0")/../.." && pwd)/.agent/work/蒋葆增fable"
DIR="$WORK/stills-$1"
rm -rf "$DIR"; mkdir -p "$DIR"
node "$(dirname "$0")/render.mjs" --stills "$2" --out "$DIR" --jpg >/dev/null
N=$(ls "$DIR" | wc -l | tr -d ' ')
ROWS=$(( (N + 2) / 3 ))
ffmpeg -hide_banner -loglevel error -y -pattern_type glob -i "$DIR/f*.jpg" -vf "scale=640:-1,tile=3x${ROWS}:padding=6:color=red" -frames:v 1 -q:v 3 "$WORK/sheet-$1.jpg"
echo "$WORK/sheet-$1.jpg"
