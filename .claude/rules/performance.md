---
paths:
  - "sections/**"
  - "blocks/**"
  - "snippets/**"
  - "layout/**"
  - "templates/**"
  - "assets/**"
---

# Performance (Core Web Vitals)

Hard constraint, not a polish pass. All lab numbers on **mobile emulation** (mid-range Android, Moto G class, throttled network); desktop numbers are informational.

## Budgets

- Field p75: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Above-the-fold byte targets (uncompressed): ≤ 150 KB JS, ≤ 80 KB CSS, ≤ 250 KB images. Shrine's baseline is fixed, so enforce these as deltas: custom work may not push a template over, and any regression vs current live blocks merge (> 2 Lighthouse perf points or any CWV).
- Field data: PageSpeed Insights (CrUX) and Admin → Online Store → Themes → Theme performance.

## Images (single source of truth)

- Always `image_url` + `image_tag`; never the legacy `img_url` or raw `<img src="{{ image.src }}">`. The CDN handles WebP/AVIF and responsive variants.
- Always set `width`/`height` or enforce `aspect-ratio`: missing dimensions = CLS.

```liquid
{{ image | image_url: width: 1200 | image_tag:
   width: image.width, height: image.height,
   sizes: '(min-width: 750px) 50vw, 100vw',
   widths: '375, 550, 750, 1100, 1500, 2200',
   loading: 'lazy' }}
```

- LCP image (hero, first PDP image, first slide): `loading="eager"` + `fetchpriority="high"` + `<link rel="preload">` from `theme.liquid` at the exact width the browser will pick.
- Everything else: `loading="lazy"` + `decoding="async"`.
- Accurate `sizes`, reasoned from `100vw` mobile outward (a wrong `sizes` makes `widths` pointless). Upload sources at ≤ 2400 px on the long edge.
- No Base64 / data-URL images in HTML.

## Fonts

- Shopify-hosted fonts (`font_picker` + `font_face`): CDN-served, subsettable. No Google Fonts, Typekit or other third-party hosts.
- `font-display: swap` on every `@font-face`; preload only the critical weight(s) above the fold; subset to `latin` unless `latin-ext` is actually used.
- `size-adjust` / `ascent-override` / `descent-override` on fallback faces to eliminate font-swap CLS.

## Layout stability

- Explicit dimensions or `aspect-ratio` on every `<img>`, `<video>`, `<iframe>`, `<model-viewer>`.
- Reserve space (`min-height`) for banners, cookie bars and review widgets; never inject above existing content after load.
- Sticky offsets come from Shrine's header-height CSS vars, never hardcoded pixels.

## Third-party apps & network

- After images, the #1 regression source. Measure Lighthouse with each app embed on vs off; push back when an app costs more than ~10 perf points.
- Uninstalled apps leave script tags behind: grep `layout/` and `snippets/` for orphaned references when an app is removed.
- Preconnect sparingly; Shrine already preconnects `cdn.shopify.com` in `theme.liquid`. Add others only if actually used.
- Avoid redirect chains: every 301/302 is a round trip. Check for SEO-app redirect chains.
