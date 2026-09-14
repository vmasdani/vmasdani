---
paths:
  - 'tests/Feature/**'
---

# Feature

## Inertia testing + local test DB caveats
The Inertia page directory is lowercase resources/js/pages, but inertia-laravel's default test page_paths expects 'Pages', so assertInertia(fn => $page->component('blog/index')) fails with "page component file does not exist". Pass a second arg to disable the file check: ->component('blog/index', false). Also: JSON run endpoints (tools/*/run) validate to a 302 redirect unless the request expects JSON — use $this->getJson(...) in feature tests. The Process facade fake must use the closure form (Process::fake(fn () => Process::result(...))) because array-command invocations do not match string patterns like 'ping*'.
