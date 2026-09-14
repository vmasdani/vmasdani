---
paths:
  - resources/js/lib/tools.ts
  - resources/js/lib/password-strength.ts
  - 'resources/js/lib/**'
  - resources/js/lib/qr-code.ts
  - resources/js/lib/dns-propagation.ts
  - resources/js/lib/background-removal.ts
---

# Lib

## Tool registry is the source of truth
Add a tool by adding one entry to resources/js/lib/tools.ts (slug/title/description/icon/category/tags), its page at resources/js/pages/tools/{slug}.tsx, and the slug to App\Support\Tools::slugs() (backend route + sitemap). The index search, sidebar and header title all read the registry; do not hardcode tool lists.

## Password strength is a local heuristic plus HIBP k-anonymity
analyzePassword() estimates entropy from length x log2(character pool), then deducts for common passwords, repeats, sequences, dates and low variety. checkBreaches() SHA-1s the password in the browser via Web Crypto and sends only the first 5 hex chars to the Have I Been Pwned range API. Keep the password client-side; never send it to our server.

## Client-only tools: registry + page + slug, with a Vitest test
Pure tools (base64, url-encode, hash, password-generator, uuid, timestamp) run entirely in the browser via resources/js/lib/*.ts, each with a colocated *.test.ts. Add one by: (1) a registry entry in lib/tools.ts, (2) a page resources/js/pages/tools/{slug}.tsx using components/tool-page.tsx (it renders Seo + heading from the registry) and components/ui/copy-button.tsx for output, (3) the slug in App\Support\Tools::slugs() (route + sitemap). No server route or PHP logic is needed. Run `npm test` (Vitest, node environment, @ alias configured in vitest.config.ts).

## QR uses qrcode-generator for a node-testable matrix
QR rendering uses qrcode-generator (pure JS, no canvas) so the module matrix builds in both the browser and the Vitest node environment. We render our own SVG from isDark() for custom colours, and rasterise to PNG via a <canvas> only in the browser (qrPngDataUrl, not unit-tested). Tests assert matrix size, error-level growth and SVG output. Do not swap to a canvas-only library like qrcode without providing a node-safe test path.

## DNS propagation is limited to CORS JSON (DoH) resolvers
The browser queries resolvers directly, so a resolver can only be added to DNS_RESOLVERS if its DoH endpoint returns application/dns-json AND sends Access-Control-Allow-Origin. Verified working: Google, Cloudflare, DNS.SB, tiar.app, Alibaba AliDNS. Wire-format / RFC8484-only endpoints (AdGuard, NextDNS, Quad9, applied-privacy, dnsforge) and non-CORS JSON endpoints (Tencent doh.pub, 360) fail from the browser even though they answer from curl — do not add them.

## Background remover: absolute publicPath + vendored assets
@imgly/background-removal builds chunk URLs with `new URL(name, publicPath)`, which requires an ABSOLUTE base — never pass a bare `/background-removal/` path or it throws "Invalid URL". `backgroundRemovalPublicPath()` prefixes `window.location.origin`. Model chunks + WASM are vendored in public/background-removal/ (committed, ~138MB) and must stay in lockstep with the installed @imgly/background-removal version: copy the matching resources.json from https://staticimgly.com/@imgly/background-removal-data/{version}/dist/ then download every hash-named chunk referenced for isnet_fp16 + isnet_quint8 + ort-wasm-simd-threaded.{wasm,mjs}. The lib is a dynamic import on the page, never a static import, so tests stay node-safe.
