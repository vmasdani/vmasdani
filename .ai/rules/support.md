---
paths:
  - app/Support/NetworkService.php
---

# Support

## Network tools must use array-based Process, never shell interpolation
The online ping/nmap tools run real binaries on the server. NetworkService MUST invoke them via Illuminate\Support\Facades\Process with an ARRAY of arguments (e.g. ['ping','-c',$n,$host]) — never interpolate user input into a shell string, or it is a command-injection hole. Host/port input is additionally validated by app/Rules/HostAddress and the Tools form requests, and every call is bounded by Process::timeout(). Laravel Process results expose ->output()/->errorOutput()/->failed(), NOT Symfony's getOutput(). nmap uses '-Pn -n -T4 -sT' (connect scan, no root); do not add --max-hostname-attempts (unrecognized).

## Shared hosting: no network binaries — pure PHP/HTTP implementations
The production host is shared hosting without root: nmap, speedtest-cli and nc are absent. nmap() must stay a pure-PHP TCP connect scan (async stream_socket_client + stream_select, blocking confirm, banner grab); SYN/version modes degrade on purpose. ping/nslookup still shell out to coreutils via Process with arg arrays — keep that, and keep the hard timeouts everywhere.

## Speed test runs in the browser, not on the server
The speed test is intentionally client-side (resources/js/lib/speedtest.ts): a server-side probe only measures the hosting datacenter, not the visitor. It fetches speed.cloudflare.com/__down and /__up directly from the browser (CORS-enabled, expose cf-meta-colo/city). Do not reintroduce a server NetworkService::speedtest() — it was removed along with its controller, route and tests. __down caps at ~25 MiB per request.
