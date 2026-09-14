---
paths:
  - resources/js/components/seo.tsx
---

# Components

## All page meta goes through the Seo component
Public pages render meta through components/seo.tsx, not raw <Head>. Site defaults come from the `seo` shared prop in HandleInertiaRequests (baseUrl from the request host, so canonical/OG do not depend on APP_URL). robots.txt, sitemap.xml and sitemap.txt are served by SitemapController, generated from Blog::all() + Tools::slugs(); public/robots.txt was removed on purpose so the dynamic route wins.
