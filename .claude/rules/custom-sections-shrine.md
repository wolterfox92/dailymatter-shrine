---
paths:
  - "sections/**"
  - "blocks/**"
  - "snippets/**"
  - "assets/**"
  - "layout/**"
---

# Custom sections & Shrine integration

Bespoke, designer-produced sections are the default job here, not the exception. "Never edit in place" is about Shrine's files; our own `custom-*` files are ours to edit freely.

## Custom sections

- Prefix everything: `sections/custom-*.liquid`, `blocks/custom-*.liquid`, `snippets/custom-*.liquid`, `assets/custom-*.{js,css}`.
- **Standalone data:** read from `section.settings`, `block.settings`, the `product` / `collection` context and metafields. Shrine integration only per the policy below.
- **Presets required:** every custom section schema ships a preset; without one the section cannot be added via "Add section" in the editor.
- **Design tokens:** pull colors, typography and spacing from Shrine's CSS custom properties and color schemes so the merchant can restyle from the editor. Never hardcode brand values.
- **Accept `@app` blocks** in the schema unless there is a concrete reason not to.
- **Document each section** in `docs/sections.md`: designer / Figma link, purpose, exposed settings, Shrine integration points.

## Asset strategy (know what bundles where)

- `{% stylesheet %}` and `{% javascript %}` content is **concatenated across all sections into site-wide files loaded on every page**, whether the section is used or not. Use them only for tiny static bits.
- Per-instance dynamic CSS from settings → a `{% style %}` block (renders inline, supports Liquid) or a custom property on the section root: `style="--gap: {{ section.settings.gap }}px"`. Never full inline `style` rules.
- Component CSS/JS of any real size → external `assets/custom-<section>.css|js`, loaded from the section via `{{ 'custom-x.css' | asset_url | stylesheet_tag }}` and `<script src="{{ 'custom-x.js' | asset_url }}" defer></script>`. External files cache independently and each gets its own 2 MB crawl budget.

## Shrine integration (closed source; no documented public API)

Native commerce primitives (version: see Versions in CLAUDE.md): cart drawer (upsells, free-gift thresholds, progress bar, discount field, cart notes, payment badges), product bundles with pricing/grouping, quantity breaks, megamenu with images and multi-column dropdowns, comparison tables, tickers and announcement bars, native MP4 media (no YouTube/Vimeo embeds), countdown timers, trust badges, scroll animations, section "connection" grid.

Two work modes:

- **Pure use:** merchant wants the stock feature with no design changes → configure in the editor only. A custom rebuild costs update-safety and duplicates existing work.
- **Design integration:** a custom section incorporates a Shrine feature (bespoke PDP using Shrine's cart drawer, story-scroll promoting a Shrine bundle) → the design is ours, the commerce is Shrine's.

Policy:

- Integrate at the DOM level: dispatch and listen to the events, and read the data attributes, that Shrine's own components use. Find them by reading Shrine's `assets/` JS. Never assume names.
- Direct calls into Shrine's internal JS functions are a last resort.
- Log every integration point (event name, payload shape, source file) in `docs/sections.md` and retest each one after every Shrine update: internals can change without notice.

## Upgrade safety

Shrine updates **do not respect edits**. Every customization must survive an update, or be mechanically re-applicable.

- Copy-then-modify: a behaviour change on a core file means a `custom-` prefixed copy, referenced from our own template or section.
- Track every unavoidable core edit in `docs/changes.md`: date, file path, reason, exact diff. Audit this file before every Shrine update.
- `theme.liquid` hooks are the only sanctioned core edit, for meta tags, structured data or scripts that genuinely cannot live in an app embed:

```liquid
{%- comment -%} CUSTOM-START: GA4 enhanced ecommerce — see docs/changes.md#ga4 {%- endcomment -%}
…
{%- comment -%} CUSTOM-END: GA4 {%- endcomment -%}
```

Every bracketed block has a matching `docs/changes.md` entry. The full update procedure is the `shrine-update` skill.
