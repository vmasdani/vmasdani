#!/usr/bin/env bash
set -euo pipefail

# Vendor the zxing-wasm reader into public/barcode-scanner/ so the scanner is
# fully self-hosted. The file is keyed to the installed zxing-wasm version, so
# it is skipped when a .version stamp already matches. FORCE=1 re-copies.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/node_modules/zxing-wasm/package.json"
SRC="$ROOT/node_modules/zxing-wasm/dist/reader/zxing_reader.wasm"
DEST="$ROOT/public/barcode-scanner"

if [[ ! -f "$PKG" || ! -f "$SRC" ]]; then
    echo "error: zxing-wasm is not installed; run npm install first." >&2
    exit 1
fi

VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$PKG','utf8')).version")"
STAMP="$DEST/.version"

if [[ -f "$STAMP" && "$(cat "$STAMP" 2>/dev/null)" == "$VERSION" && "${FORCE:-0}" != "1" ]]; then
    echo "barcode-scanner assets for v$VERSION already vendored; skipping (FORCE=1 to re-copy)."
    exit 0
fi

mkdir -p "$DEST"
cp "$SRC" "$DEST/zxing_reader.wasm"
printf '%s' "$VERSION" > "$STAMP"

echo "vendored barcode-scanner assets for v$VERSION into public/barcode-scanner/."
