#!/bin/bash
# Exporta el Focus de focus.py (T1632) a public/modelo/: GLB comprimido (meshopt), entorno HDR del estudio y póster sin matrícula.
set -euo pipefail
cd "$(dirname "$0")/../.."
T=$(mktemp -d /tmp/focus-glb.XXXX)
blender -b --factory-startup -P herramientas/focus/focus.py -- "$T/" --glb >/dev/null
npx gltf-transform optimize "$T/focus-crudo.glb" public/modelo/focus.glb --compress meshopt --simplify-ratio 0.6 --simplify-error 0.0004 \
  --join false --flatten false --instance false --palette false
cp "$T/estudio.hdr" public/modelo/estudio.hdr
blender -b --factory-startup -P herramientas/focus/focus.py -- "$T/poster.png" --view hero --width 1280 --samples 48 --sin-matricula >/dev/null
ffmpeg -v error -y -i "$T/poster.png" -q:v 4 public/modelo/poster.jpg
rm -rf "$T"
ls -la public/modelo
