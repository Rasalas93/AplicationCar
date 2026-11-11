#!/usr/bin/env bash
# Genera iconos de lanzador y splash de Android desde public/iconos/icono.svg (requiere inkscape).
set -euo pipefail
cd "$(dirname "$0")/../.."
SVG=public/iconos/icono.svg RES=android/app/src/main/res T=$(mktemp -d)
sed -e 's#<rect width="512" height="512" rx="112" fill="url(\#f)"/>##' -e 's#viewBox="0 0 512 512"#viewBox="-128 -128 768 768"#' "$SVG" > "$T/frente.svg"
for par in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  d=${par%:*} s=${par#*:}
  inkscape "$SVG" -w "$s" -h "$s" -o "$RES/mipmap-$d/ic_launcher.png" 2>/dev/null
  cp "$RES/mipmap-$d/ic_launcher.png" "$RES/mipmap-$d/ic_launcher_round.png"
  inkscape "$T/frente.svg" -w $((s * 9 / 4)) -h $((s * 9 / 4)) -o "$RES/mipmap-$d/ic_launcher_foreground.png" 2>/dev/null
done
sed -i 's#<color name="ic_launcher_background">.*</color>#<color name="ic_launcher_background">\#120D10</color>#' "$RES/values/ic_launcher_background.xml"
for f in "$RES"/drawable*/splash.png; do
  read -r w h < <(python3 -c "import struct,sys;d=open(sys.argv[1],'rb').read(24);print(*struct.unpack('>II',d[16:24]))" "$f")
  m=$(( (w < h ? w : h) / 4 ))
  printf '<svg xmlns="http://www.w3.org/2000/svg" width="%s" height="%s"><rect width="100%%" height="100%%" fill="#07080C"/><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="%s" height="%s" x="%s" y="%s">%s</svg></svg>' \
    "$w" "$h" "$m" "$m" $(( (w - m) / 2 )) $(( (h - m) / 2 )) "$(sed '1d;$d' "$SVG")" > "$T/s.svg"
  inkscape "$T/s.svg" -w "$w" -h "$h" -o "$f" 2>/dev/null
done
rm -rf "$T"
