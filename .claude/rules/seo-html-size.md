---
paths:
  - "templates/**"
  - "sections/**"
  - "layout/**"
---

# SEO: HTML size (the 2 MB rule)

Googlebot's indexing pipeline processes only the **first 2 MB of uncompressed HTML**; the rest is silently dropped, with no Search Console warning. The URL Inspection Tool uses the 15 MB fetching crawler and will not show it, so never trust it to confirm full indexing. External CSS and JS files each get their own 2 MB budget (PDFs 64 MB). Compression does not help: the limit is measured on uncompressed bytes. Highest-risk on this stack: inline filter/variant JSON blobs, large metaobject lists, Base64 images, app-injected inline code, infinite-scroll DOM growth.

## Thresholds (uncompressed, measured on the largest realistic page: PLP with all filters open, longest PDP, longest article, full homepage)

| Threshold | Status | Action |
|---|---|---|
| < 500 KB | Safe | Ship |
| 500 KB – 1.5 MB | Watch | Document why, plan reduction |
| 1.5 – 2 MB | Critical | Block release until reduced |
| > 2 MB | Fail | Truncation guaranteed, do not ship |

Dev-server proxy check: `curl -s http://127.0.0.1:9292/<path> | wc -c` stays under 500000 on the largest affected template.

## Source order (if truncation hits, the top survives)

1. **First 100 KB:** `<head>` with meta, canonical, hreflang; **JSON-LD in `<head>`** (never before `</body>`); `<h1>` and intro copy; critical CSS if inline.
2. **First ~1 MB:** main content, all H2/H3 headings, most important internal links, above-the-fold elements.
3. **Rest:** related items, sidebars, reviews, comments, non-critical UI.

## Rules

- No `<style>` blocks beyond a < 14 KB critical-CSS inline; no inline JS bundles (tracking snippets are fine). Component CSS/JS goes external per the asset strategy.
- JSON-LD complete and in `<head>`; a truncated block invalidates the entire schema. Watch `Product` with many variants, `FAQPage`, `BreadcrumbList` and review aggregations.
- DOM ≤ 1500 nodes per page; flag any section shipping > 200 nodes; no wrapper-in-wrapper soup.
- Collection filters rendered as an inline JSON blob: measure on a large collection; refactor to Section Rendering API / Storefront API fetches when it balloons.
- Metaobject lists: render only what the page needs above the fold, defer the rest.
- Localized content must not push critical content past the priority lines above.
