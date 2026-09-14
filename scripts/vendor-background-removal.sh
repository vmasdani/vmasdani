#!/usr/bin/env bash
set -euo pipefail

# Vendor the @imgly/background-removal model chunks and WASM runtime into
# public/background-removal/ so the tool is fully self-hosted. The files are
# content-addressed and keyed to the installed package version, so they are
# skipped when a .version stamp already matches. FORCE=1 re-fetches.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_JSON="$ROOT/node_modules/@imgly/background-removal/package.json"
DEST="$ROOT/public/background-removal"

if [[ ! -f "$PKG_JSON" ]]; then
    echo "error: @imgly/background-removal is not installed; run npm install first." >&2
    exit 1
fi

VERSION="$(node -p "require('$PKG_JSON').version")"

STAMP="$DEST/.version"
if [[ -f "$STAMP" && "$(cat "$STAMP" 2>/dev/null)" == "$VERSION" && "${FORCE:-0}" != "1" ]]; then
    echo "background-removal assets for v$VERSION already vendored; skipping (FORCE=1 to re-fetch)."
    exit 0
fi

mkdir -p "$DEST"

DEST="$DEST" BASE="https://staticimgly.com/@imgly/background-removal-data/$VERSION/dist" VERSION="$VERSION" python3 - <<'PY'
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

dest = Path(os.environ["DEST"])
base = os.environ["BASE"]
version = os.environ["VERSION"]

resource_url = f"{base}/resources.json"
print(f"fetching {resource_url}")
request = urllib.request.Request(
    resource_url,
    headers={"User-Agent": "Mozilla/5.0 (compatible; background-remover-vendor/1.0)"},
)
with urllib.request.urlopen(request, timeout=60) as response:
    manifest = json.load(response)
(dest / "resources.json").write_text(json.dumps(manifest))

keys = [
    "/models/isnet_fp16",
    "/models/isnet_quint8",
    "/onnxruntime-web/ort-wasm-simd-threaded.wasm",
    "/onnxruntime-web/ort-wasm-simd-threaded.mjs",
]

jobs = []
for key in keys:
    entry = manifest.get(key)
    if not entry:
        print(f"warn: {key} missing from manifest for v{version}", file=sys.stderr)
        continue
    for chunk in entry["chunks"]:
        name = chunk["name"]
        want = chunk["offsets"][1] - chunk["offsets"][0]
        jobs.append((name, f"{base}/{name}", want))


def fetch(name: str, url: str, want: int) -> tuple[str, str]:
    target = dest / name
    if target.exists() and target.stat().st_size == want:
        return name, "cached"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; background-remover-vendor/1.0)"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        data = response.read()
    if len(data) != want:
        raise SystemExit(f"size mismatch for {name}: expected {want}, got {len(data)}")
    target.write_bytes(data)
    return name, "downloaded"


with ThreadPoolExecutor(max_workers=8) as pool:
    for name, status in pool.map(lambda job: fetch(*job), jobs):
        print(f"  {status}: {name}")

(dest / ".version").write_text(version + "\n")
total = sum((manifest.get(key) or {}).get("size", 0) for key in keys)
print(f"vendored {len(jobs)} chunks ({total / 1e6:.1f} MB) for v{version}")
PY