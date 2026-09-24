#!/usr/bin/env bash
set -euo pipefail

# Deploy build for shared hosting.
#
# Why public_html exists: the hosting plan serves the site from public_html
# and its root cannot be changed to point at Laravel's public/ directory.
# build.sh therefore mirrors public/ -> public_html/ and packages the repo
# (minus the exclusions below) into ../vmasdani.zip, which is what gets
# uploaded. public_html is regenerated on every build and IS committed to git
# as the deploy artifact, so any source change that touches public assets
# shows up there as deleted+re-added build hashes. Do not delete or "clean
# up" public_html and do not point Laravel's docroot at it locally.

# Ask whether to bundle the on-device model assets. They are large (~270 MB:
# background-removal ~138 MB, license-plate ~69 MB, OCR ~45 MB, face-blur
# ~11 MB) and get mirrored into both public/ and public_html/, so including
# them roughly doubles the archive and is only needed on the first deploy or
# when a model version changes. Default is NO so routine code/blog uploads
# stay small. Set BUNDLE_MODELS=1 (or 0) to skip the prompt.
BUNDLE_MODELS="${BUNDLE_MODELS:-}"
if [[ -z "$BUNDLE_MODELS" ]]; then
    if [[ -t 0 ]]; then
        read -r -p "Bundle on-device model assets (~270 MB)? [y/N] " reply || true
    else
        reply=""
    fi
    case "${reply:-}" in
        [yY]|[yY][eE][sS]) BUNDLE_MODELS=1 ;;
        *) BUNDLE_MODELS=0 ;;
    esac
fi

# Only fetch the model assets when they are actually going into the archive
# (each vendor script is idempotent; see FORCE=1 in the scripts).
if [[ "$BUNDLE_MODELS" == "1" ]]; then
    for script in "$(dirname "${BASH_SOURCE[0]}")"/scripts/vendor-*.sh; do
        "$script"
    done
fi

# Public directories that hold vendored model assets and are dropped when not
# bundling.
MODEL_DIRS=(background-removal barcode-scanner ocr face-blur license-plate)

npm run build

# Mirror the built public assets into public_html before packaging.
rm -rf public_html
cp -r public public_html

# When not bundling, drop the vendored payload from the deploy mirror and
# keep it out of the archive.
EXCLUDES=()
if [[ "$BUNDLE_MODELS" != "1" ]]; then
    for dir in "${MODEL_DIRS[@]}"; do
        rm -rf "public_html/$dir"
        EXCLUDES+=(-x "public/$dir/*" -x "public_html/$dir/*")
    done
fi

rm -f ../vmasdani.zip
zip -r ../vmasdani.zip . \
  -x 'node_modules/*' '.git/*' 'imgref/*' 'tests/*' \
  -x '.github/*' '.claude/*' '.agents/*' '.ai/*' \
  -x '/AGENTS.md' '/CLAUDE.md' '/spec.md' '/README.md' \
  -x '*.md:Zone.Identifier' \
  "${EXCLUDES[@]}"
