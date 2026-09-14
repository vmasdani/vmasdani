---
paths:
  - 'resources/js/**'
---

# Js

## Public site = shadcn inset sidebar; / is featured post not a list
Public site (home, blog, tools) uses layouts/site-layout.tsx = SidebarProvider + SiteSidebar (inset, collapsible=icon) + SidebarInset. Mobile works automatically via the ui/sidebar Sheet + the SidebarTrigger in the header — do NOT remove the trigger. SiteSidebar (components/site-sidebar.tsx) lists Blog group (Home /, Blog /blog) + Utilities group (tools) and social footer (GitHub/LinkedIn/Facebook in a shared `social` const). Do NOT reuse the starter AppSidebar (fake Acme data) for public pages. Route map: GET / -> BlogController@home renders page 'home' showing ONLY the featured 'welcome' post (big 'Valian Masdani's Blog' hero, not a list). GET /blog -> index (the searchable list). GET /blog/{slug} -> article. Emoji per post title comes from App\Support\Emoji::forPost (keyword map, falls back to a pencil); exposed as post['emoji'] via Blog::read().
