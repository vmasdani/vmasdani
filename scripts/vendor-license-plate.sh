#!/usr/bin/env bash
set -euo pipefail

# Vendor the license-plate detector into public/license-plate/: the YOLOS ONNX
# model (detection only) and the onnxruntime-web WASM runtime it runs on. The
# plate detector is experimental; swap MODEL_URL below for a different ONNX
# detector if you want better regional accuracy.
#
# The model is a YOLOS fine-tune exported by onnx-community from
# nickmuchi/yolos-small-finetuned-license-plate-detection (base: hustvl/yolos,
# Apache-2.0). Verify the weights' license before commercial use.
#
# Files are keyed to the installed onnxruntime-web version via a .version stamp;
# FORCE=1 re-fetches.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORT_PKG="$ROOT/node_modules/onnxruntime-web/package.json"
ORT_DIST="$ROOT/node_modules/onnxruntime-web/dist"
DEST="$ROOT/public/license-plate"
ORT_DEST="$DEST/ort"
MODEL_URL="${MODEL_URL:-https://huggingface.co/onnx-community/yolos-small-finetuned-license-plate-detection-ONNX/resolve/main/onnx/model_quantized.onnx}"

if [[ ! -f "$ORT_PKG" ]]; then
    echo "error: onnxruntime-web is not installed; run npm install first." >&2
    exit 1
fi

ORT_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$ORT_PKG','utf8')).version")"
VERSION="$ORT_VERSION/$MODEL_URL"
STAMP="$DEST/.version"

if [[ -f "$STAMP" && "$(cat "$STAMP" 2>/dev/null)" == "$VERSION" && "${FORCE:-0}" != "1" ]]; then
    echo "license-plate assets for v$ORT_VERSION already vendored; skipping (FORCE=1 to re-fetch)."
    exit 0
fi

mkdir -p "$ORT_DEST"

# OnnxRuntime's wasm backend needs the simd-threaded glue + binary.
cp "$ORT_DIST/ort-wasm-simd-threaded.mjs" "$ORT_DEST/"
cp "$ORT_DIST/ort-wasm-simd-threaded.wasm" "$ORT_DEST/"

echo "fetching $MODEL_URL"
curl -fsSL --retry 3 -o "$DEST/model_quantized.onnx" "$MODEL_URL"

printf '%s' "$VERSION" > "$STAMP"

echo "vendored license-plate assets (detector + ort $ORT_VERSION) into public/license-plate/."
