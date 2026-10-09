#!/bin/bash
# d-editorial-craft helper: tile analyzer screenshots into 2x2 contact sheets in /tmp/dec-sheets/<slug>-{a,b,c}.jpg
# usage: tools/dec-sheet.sh <site-dir>
d="$1"; s=$(basename "$d"); out=/tmp/dec-sheets; mkdir -p $out
sh="$d/shots"
tile() { # $1 name, $2..$5 images
  n=$1; shift
  args=(); for f in "$@"; do [ -f "$f" ] && args+=(-i "$f"); done
  c=$(( ${#args[@]} / 2 )); [ $c -eq 0 ] && return
  while [ $c -lt 4 ]; do args+=(-i "${args[1]}"); c=$((c+1)); done
  ffmpeg -loglevel error -y "${args[@]}" -filter_complex "[0]scale=720:450[a];[1]scale=720:450[b];[2]scale=720:450[c];[3]scale=720:450[d];[a][b][c][d]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0" -q:v 4 "$out/$s-$n.jpg"
}
tile intro "$sh/intro-1-350ms.jpg" "$sh/intro-2-900ms.jpg" "$sh/intro-3-1800ms.jpg" "$sh/intro-4-3200ms.jpg"
tile a "$sh/01-scroll.jpg" "$sh/02-scroll.jpg" "$sh/03-scroll.jpg" "$sh/04-scroll.jpg"
tile b "$sh/05-scroll.jpg" "$sh/06-scroll.jpg" "$sh/07-scroll.jpg" "$sh/08-scroll.jpg"
ls $out/$s-*
# supplemental x- shots (from dec-shoot.mjs)
if [ -f "$sh/x-00-hero.jpg" ]; then
  tile xintro "$sh/x-intro-600ms.jpg" "$sh/x-intro-1500ms.jpg" "$sh/x-intro-2500ms.jpg" "$sh/x-intro-4000ms.jpg"
  tile xa "$sh/x-00-hero.jpg" "$sh/x-01.jpg" "$sh/x-02.jpg" "$sh/x-03.jpg"
  tile xb "$sh/x-04.jpg" "$sh/x-05.jpg" "$sh/x-06.jpg" "$sh/x-07.jpg"
  tile xc "$sh/x-08.jpg" "$sh/x-09.jpg" "$sh/x-10.jpg" "$sh/x-intro-6000ms.jpg"
fi
