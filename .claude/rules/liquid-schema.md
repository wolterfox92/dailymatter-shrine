---
paths:
  - "sections/**/*.liquid"
  - "blocks/**/*.liquid"
  - "snippets/**/*.liquid"
  - "templates/**"
  - "config/settings_schema.json"
---

# Liquid, schema & metafields

## Liquid

- `{% render %}` over `{% include %}` (deprecated; `render` has sandboxed scope).
- LiquidDoc (`{%- doc -%} … {%- enddoc -%}`) in snippets and blocks; sections are documented via their schema.
- Respect scope: `block.settings.x` in blocks, `section.settings.x` in sections; `product`, `collection`, `cart` are context-specific.
- Existence checks before output: `{% if product.metafields.custom.tagline != blank %} … {% endif %}`.
- Assets via `{{ 'file.js' | asset_url }}` + `stylesheet_tag` / `script_tag`.

## Schema

- Rich setting types over raw text: `image_picker` (not `url`), `color`, `color_scheme`, `product` / `collection` / `blog` pickers, `range` for bounded numbers.
- Labels via `t:` keys, never hardcoded English. `visible_if` drives conditional fields; check Shrine's existing visibility patterns first.
- Mirror Shrine's setting groupings, presets and naming so the editor experience stays consistent.

## Metafields

- Themes **read** metafields, never write them (admin, apps and Shopify Flow are the source of truth).
- Static keys only (`product.metafields.custom.tagline`); no dynamic key construction. Always check `!= blank`.
- Values cap at 16 KB; truncation is a data issue, not a theme issue.
- Document every namespace/key the theme depends on in `README.md`. Check Shrine's docs before defining new namespaces: Shrine ships metafield-driven features of its own.
