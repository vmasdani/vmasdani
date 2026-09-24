---
paths:
  - 'tests/**'
---

# Tests

## Feature tests must disable Inertia SSR dispatch
Inertia's SSR gateway (HttpGateway) is enabled by default and POSTs to INERTIA_SSR_URL (127.0.0.1:13714) on every full HTML render, even though no SSR server runs in dev/tests. Where the network stack blackholes the connect (WSL), each page request stalls ~10s (Laravel Http default timeout). phpunit.xml sets INERTIA_SSR_ENABLED=false; .env mirrors it. Only re-enable when an actual SSR server runs. Never diagnose page-render hangs as DB/session issues — check the @inertia directive first.
