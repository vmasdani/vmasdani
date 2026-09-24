#!/usr/bin/env bash
set -euo pipefail

# Vendor the MediaPipe face detector into public/face-blur/: the Tasks Vision
# WASM runtime and the BlazeFace short-range model. Detection runs in the
# browser. Files are keyed to the installed version via a .version stamp;
# FORCE=1 re-fetches.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/node_modules/@mediapipe/tasks-vision/package.json"
WASM_SRC="$ROOT/node_modules/@mediapipe/tasks-vision/wasm"
DEST="$ROOT/public/face-blur"
MODEL_URL="https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"

if [[ ! -f "$PKG" || ! -d "$WASM_SRC" ]]; then
    echo "error: @mediapipe/tasks-vision is not installed; run npm install first." >&2
    exit 1
fi

VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$PKG','utf8')).version")"
STAMP="$DEST/.version"

if [[ -f "$STAMP" && "$(cat "$STAMP" 2>/dev/null)" == "$VERSION" && "${FORCE:-0}" != "1" ]]; then
    echo "face-blur assets for v$VERSION already vendored; skipping (FORCE=1 to re-fetch)."
    exit 0
fi

mkdir -p "$DEST/wasm"
cp "$WASM_SRC"/* "$DEST/wasm/"

echo "fetching $MODEL_URL"
curl -fsSL --retry 3 -o "$DEST/blaze_face_short_range.tflite" "$MODEL_URL"

printf '%s' "$VERSION" > "$STAMP"

echo "vendored face-blur assets for v$VERSION into public/face-blur/."
