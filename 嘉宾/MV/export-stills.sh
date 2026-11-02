#!/bin/zsh
# 导出全部定格、总览和分镜页。用法：./嘉宾/MV/export-stills.sh
set -e
cd "${0:A:h}"
at=$(node --no-warnings --input-type=module -e "import('./shots.js').then(m => console.log(m.SHOTS.map(s => s.poster).join(',')))")
hyperframes snapshot --at "$at" --no-end --describe false -o boards/stills > /dev/null 2>&1
for f in boards/stills/frame-*-at-*.png; do
  n=${${f:t}#frame-}; n=${n%%-*}
  ffmpeg -v error -y -i "$f" -vf scale=1280:-2 -q:v 3 "boards/stills/frame-$n.jpg"
  rm "$f"
done
rm -f boards/stills/contact-sheet-*.jpg
ffmpeg -v error -y -framerate 1 -start_number 0 -i boards/stills/frame-%02d.jpg -vf "scale=480:-2,tile=8x7:padding=6:color=0xf4f1ea" -frames:v 1 -q:v 3 boards/总览.jpg
node --no-warnings gen-board.mjs
node --no-warnings gen-sheet.mjs
ls boards/stills | wc -l
