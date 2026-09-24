#!/usr/bin/env bash
set -euo pipefail

# Vendor the OCR engine into public/ocr/: the tesseract.js worker, the
# tesseract.js-core WASM builds, and the requested language data. The OCR runs
# entirely in the browser, so nothing is uploaded. Files are keyed to the
# installed versions via a .version stamp; FORCE=1 re-fetches.
#
# Languages default to English + Indonesian. Add more with:
#   LANGS="eng ind jpn chi_sim" ./scripts/vendor-ocr.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JS_PKG="$ROOT/node_modules/tesseract.js/package.json"
CORE_PKG="$ROOT/node_modules/tesseract.js-core/package.json"
JS_DIST="$ROOT/node_modules/tesseract.js/dist"
CORE_DIR="$ROOT/node_modules/tesseract.js-core"
DEST="$ROOT/public/ocr"
TESSDATA="$DEST/tessdata"
LANGS="${LANGS:-eng ind}"

if [[ ! -f "$JS_PKG" || ! -f "$CORE_PKG" ]]; then
    echo "error: tesseract.js / tesseract.js-core are not installed; run npm install first." >&2
    exit 1
fi

JS_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$JS_PKG','utf8')).version")"
CORE_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$CORE_PKG','utf8')).version")"
VERSION="$JS_VERSION/$CORE_VERSION/$LANGS"
STAMP="$DEST/.version"

if [[ -f "$STAMP" && "$(cat "$STAMP" 2>/dev/null)" == "$VERSION" && "${FORCE:-0}" != "1" ]]; then
    echo "ocr assets for v$VERSION already vendored; skipping (FORCE=1 to re-fetch)."
    exit 0
fi

mkdir -p "$DEST" "$TESSDATA"

cp "$JS_DIST/worker.min.js" "$DEST/worker.min.js"

# tesseract.js-core ships several SIMD/LSTM builds; the worker picks the best
# one it can run. Copy every glue + binary pair so no variant is missing.
cp "$CORE_DIR"/*.wasm.js "$DEST/"
cp "$CORE_DIR"/*.wasm "$DEST/"

# Language data comes from the @tesseract.js-data packages (Apache-2.0).
for lang in $LANGS; do
    url="https://cdn.jsdelivr.net/npm/@tesseract.js-data/$lang@1.0.0/4.0.0_best_int/$lang.traineddata.gz"
    echo "fetching $url"
    curl -fsSL --retry 3 -o "$TESSDATA/$lang.traineddata.gz" "$url"
done

printf '%s' "$VERSION" > "$STAMP"

echo "vendored ocr assets for v$VERSION into public/ocr/."
