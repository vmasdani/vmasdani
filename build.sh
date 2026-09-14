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

# Vendor the on-device background-removal models so the packaged site is
# fully self-hosted (idempotent; see the script for FORCE=1).
./scripts/vendor-background-removal.sh

npm run build

# Mirror the built public assets into public_html before packaging.
rm -rf public_html
cp -r public public_html

rm -f ../vmasdani.zip
zip -r ../vmasdani.zip . \
  -x 'node_modules/*' '.git/*' 'imgref/*' 'tests/*' \
  -x '.github/*' '.claude/*' '.agents/*' '.ai/*' \
  -x '/AGENTS.md' '/CLAUDE.md' '/spec.md' '/README.md' \
  -x '*.md:Zone.Identifier'
