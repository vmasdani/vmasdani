---
paths:
  - routes/web.php
---

# Routes

## Tool run endpoints are unthrottled by design
The tools/*/run JSON endpoints intentionally have no throttle middleware. DDoS/abuse protection is delegated to Cloudflare in front of the app. Do not re-add throttle: without revisiting that decision. The binaries remain bounded only by Process timeouts in NetworkService, so keep those timeouts.
