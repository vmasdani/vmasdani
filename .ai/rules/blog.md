---
paths:
  - 'blog/**'
---

# Blog

## Blog infographics come from `infographic:` front matter
Post infographics live in front matter as `infographic:` block lists, each item `"EMOJI Short label"` (quoted when needed). Blog::normalizeInfographic splits into ['emoji','label']; welcome post has none on purpose. Rendered by components/post-infographic.tsx at top of blog/show.tsx and reused (first 3 points) as the home "map" card grid. Home (BlogController::home) passes `post` (welcome, for the start-here strip) plus `posts` = all non-featured summaries; it no longer renders the full welcome html. Prefer server-rendered HTML infographics over prerendered images (dark mode, responsive, tiny payload); images only make sense later for OG social cards.
