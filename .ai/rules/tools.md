---
paths:
  - resources/js/pages/tools/hash.tsx
---

# Tools

## Hash verifier is server-side, unlike the SHA generator
The hash page is hybrid: the SHA-1/256/384/512 generator stays in the browser (Web Crypto), but the bcrypt/Argon2 verifier POSTs to tools/hash/verify -> Tools\HashVerifyController, which uses PHP password_verify/password_get_info. So bcrypt/Argon2 are NOT computed client-side and the hash + candidate password leave the browser. The page POSTs with raw fetch, so it relies on the csrf-token meta added to resources/views/app.blade.php (not Inertia's automatic CSRF).

## Password-hash generation shares the server-side pattern
Generation of bcrypt/Argon2 hashes is also server-side: tools/hash/generate -> Tools\HashGenerateController uses PHP password_hash() (fresh salt per call). Both POST endpoints are unthrottled like the other tool run routes; they rely on Cloudflare for abuse protection even though hashing is CPU/RAM heavier than the network tools.
