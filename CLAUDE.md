# playground-shopify — CLAUDE.md

Single-store Shopify project running **Shrine Theme Pro** (Shrine Solutions, https://shrine.io). Shrine is a closed-source premium theme: no public upstream git remote, and updates come through Shrine's own mechanism, which can overwrite files wholesale. This file exists so Claude Code makes safe, additive and consistent changes that survive theme updates.

**Store profile:** mobile-first D2C storefront. The majority of traffic is mobile; desktop is the enhancement layer. Primary storefront language is Dutch (`nl`). Deliberate English brand copy (headers, taglines) is allowed as content, never as hardcoded strings.

## Versions (single source of truth, update only here)

- Shrine Theme Pro: **v1.7.0** (~44 stock sections)
- Shopify CLI: 3.x
- Update history: `docs/changes.md`

## Golden rules

Non-negotiable. Reject or flag any change that violates one.

1. **Mobile-first.** Design, build and verify at mobile viewport first (390×844 baseline). Desktop is the enhancement. Every visual check, screenshot or test list starts mobile.
2. **Never edit Shrine core files in place.** Not sections, snippets, blocks, assets or `layout/theme.liquid`. Sole exception: bracketed `CUSTOM-START/END` hooks in `theme.liquid` (see Upgrade safety), each with a `docs/changes.md` entry.
3. **Additive only.** Every custom file gets the `custom-` prefix (`custom-*.liquid`, `custom-*.js`, `custom-*.css`). A theme update must never destroy custom work.
4. **Design is custom; commerce is Shrine's.** Build bespoke sections freely, but never reimplement Shrine's commerce logic (bundle pricing math, cart mutation flow, megamenu data model, quantity-break calculations). Integrate via Shrine's events and data attributes (see Shrine integration).
5. **No third-party apps** for features Shrine already ships: upsells, bundles, megamenu, countdowns, trust badges, comparison tables.
6. **Zero new JS dependencies.** No React, Vue, Svelte, Alpine, jQuery, Swiper, Slick, GSAP. Native platform first: `<details>`, `<dialog>`, `popover`, `IntersectionObserver`, container queries, scroll-snap, native form validation.
7. **Server-rendered.** HTML, translations, money and dates come from Liquid (`| t`, `| money`, `time_tag`). Never reconstructed in JS, never `Intl.NumberFormat` for customer-facing prices.
8. **Never invent Liquid APIs.** Hallucinated filters, tags and objects are the #1 failure mode. Verify via the `shopify-plugin:shopify-liquid` skill or Shopify Dev MCP when uncertain.
9. **Lean by default.** New features default to "no" until they've earned their place. Functional and progressive over pixel-perfect per-browser tweaks.
10. **Performance is a hard constraint.** Budgets apply as deltas for custom work (Shrine's baseline is fixed); any CWV regression vs live blocks merge.
11. **Translations ship complete.** Every new `t:` key lands in `en.default.json` **and** `nl.json` (schema keys in both `.schema.json` files) in the same commit.
12. **Never push to a live theme. Never `shopify theme publish` from CLI.** Publish-swap from the Shopify admin only.
13. **Validate before done.** `shopify theme check` and MCP `validate_theme` pass, plus the Definition of Done at the bottom of this file.

## Commands & environment

```bash
shopify theme dev --store=<store>.myshopify.com   # local dev server on 127.0.0.1:9292
shopify theme check                               # lint, run before every commit
shopify theme pull --live                         # snapshot live into git (baseline)
shopify theme push --unpublished                  # fresh QA theme, never live
```

- Store: `<store>.myshopify.com` (fill in once).
- QA convention: push to a fresh unpublished theme named `QA YYYY-MM-DD <feature>`. Never reuse live or the backup theme.
- `config/settings_data.json` is live merchant state: gitignored unless deliberately syncing, never hand-edited.
- `.shopifyignore` keeps local-only files off the remote.
- Repo baseline is a `pull --live` snapshot. Each Shrine update gets its own branch `chore/shrine-vX.Y.Z`. Branches: `feature/…`, `fix/…`, `chore/…`. Commits imperative and scoped (`Add sticky add-to-cart to product section`). Commit after every change.

## Layout (Online Store 2.0, canonical folders only)

`layout/` (`theme.liquid`, `password.liquid`; highest update risk, hooks only) · `templates/` (JSON templates) · `sections/` (Shrine stock + `custom-*`) · `blocks/` (theme blocks, `custom-*` for ours) · `snippets/` (partials via `{% render %}`) · `assets/` (flat, Shopify requirement) · `config/` (`settings_schema.json`, `settings_data.json`) · `locales/` (`*.json` storefront strings, `*.schema.json` editor strings; `en.default.*` canonical fallback, `nl` primary). Don't invent new top-level folders.

## Task router (before touching anything)

1. **Type the task:**
   - (a) Stock Shrine feature, no design change → configure in the editor, don't write code.
   - (b) Bespoke section, design or layout from the designer → build as `custom-*` files.
   - (c) Custom design that needs commerce behaviour → the design is custom, the commerce calls Shrine's primitives.
2. **Read the target file in full.** Core Shrine file? Don't edit: copy with the `custom-` prefix or use an extension point.
3. **Find the existing pattern** (variant picker, quick-add, predictive search) and match it. Grep `sections/`, `blocks/`, `snippets/` first: Shrine likely already solves it.
4. **Ask before guessing** on schema design, block nesting and cross-market behaviour. A question is cheaper than a refactor.
5. **Extension-point ladder**, in order, before creating files:
   1. Theme / section / block settings in the editor
   2. App embeds and app blocks
   3. Metafields and metaobjects
   4. New `custom-*` sections/blocks alongside Shrine's
   5. Snippets rendered from custom sections
   6. Last resort: `custom-` prefixed copy of a core file

## Mobile-first rules

- **Baseline viewport 390×844.** Build and review there first, then 768 / 1024 / 1440. Mobile always leads the test order.
- **CSS scales up, never down.** Base styles are mobile; enhance via `min-width` media queries or container queries. Desktop-first `max-width` overrides are an anti-pattern: refactor on sight.
- **Viewport units:** `dvh` / `svh` instead of `100vh` for full-height sections and drawers (mobile URL bar). `env(safe-area-inset-*)` on sticky bars and fixed footers (iOS).
- **Touch targets:** primary actions (add-to-cart, quantity steppers, swatches, close buttons) ≥ **44×44 px**; absolute minimum 24×24 px (WCAG 2.5.8). This is the single source of truth for hit sizes.
- **No hover-only interactions.** Quick-add, menus and reveals work on tap and focus; hover is an enhancement. Every available action has a visible, discoverable element.
- **Images:** reason `sizes` from `100vw` on mobile outward. Serve a separate mobile crop via `<picture>` or Shrine's mobile image settings where the composition demands it.
- **Schema:** where mobile layout differs, expose explicit mobile settings (mobile image, mobile spacing/alignment), mirroring Shrine's own patterns.
- **Sticky elements** take their offsets from Shrine's header-height CSS vars; combined sticky UI must not eat the mobile viewport.

## Upgrade safety

Shrine updates **do not respect edits**. Every customization must survive an update, or be mechanically re-applicable.

- Copy-then-modify: a behaviour change on a core file means a `custom-` prefixed copy, referenced from your own template or section.
- Track every unavoidable core edit in `docs/changes.md`: date, file path, reason, exact diff. Audit this file before every Shrine update.

### theme.liquid hooks (the only sanctioned core edit)

For meta tags, structured data or scripts that genuinely cannot live in an app embed:

```liquid
{%- comment -%} CUSTOM-START: GA4 enhanced ecommerce — see docs/changes.md#ga4 {%- endcomment -%}
…
{%- comment -%} CUSTOM-END: GA4 {%- endcomment -%}
```

Every bracketed block has a matching `docs/changes.md` entry.

### Shrine update workflow

1. `shopify theme pull --live` into a fresh branch → commit `chore: snapshot before shrine update vX.Y.Z`.
2. Duplicate the live theme in the admin as `Pre-update backup YYYY-MM-DD` (the rollback).
3. Apply the update on a separate duplicate (the test copy). Never on live, never on the backup.
4. Pull the updated theme into a new branch, diff against the snapshot, review every file Shrine changed.
5. Re-apply tracked edits from `docs/changes.md`, one commit each, changelog entry referenced.
6. Test critical flows **mobile first**, then desktop: homepage, PDP, cart drawer, checkout button, megamenu, bundles, search.
7. Re-verify every documented Shrine integration point in `docs/sections.md` (events, data attributes).
8. Lighthouse the test theme vs current live (mobile emulation). More than 2 perf points down or any CWV regression blocks the swap.
9. Publish-swap from the admin after sign-off.

## Shrine integration

Native commerce primitives (version: see Versions): cart drawer (upsells, free-gift thresholds, progress bar, discount field, cart notes, payment badges), product bundles with pricing/grouping, quantity breaks, megamenu with images and multi-column dropdowns, comparison tables, tickers and announcement bars, native MP4 media (no YouTube/Vimeo embeds), countdown timers, trust badges, scroll animations, section "connection" grid.

**Two work modes:**

- **Pure use:** merchant wants the stock feature with no design changes → configure in the editor only. A custom rebuild costs update-safety and duplicates existing work.
- **Design integration:** a custom section incorporates a Shrine feature (bespoke PDP using Shrine's cart drawer, story-scroll promoting a Shrine bundle) → the design is yours, the commerce is Shrine's.

**Integration policy** (Shrine is closed source; there is no documented public API):

- Integrate at the DOM level: dispatch and listen to the events, and read the data attributes, that Shrine's own components use. Find them by reading Shrine's `assets/` JS. Never assume names.
- Direct calls into Shrine's internal JS functions are a last resort.
- Log every integration point (event name, payload shape, source file) in `docs/sections.md` and retest each one after every Shrine update: internals can change without notice.
- Cart mutations: optimistic UI update → visible rollback on API failure → fire the cart-refresh event Shrine listens to. Never hard-redirect to `/checkout` from JS; use the standard checkout button.

## Custom sections (the normal mode of work)

Bespoke, designer-produced sections are the default job here, not the exception. "Never edit in place" is about Shrine's files; your own `custom-*` files are yours to edit freely.

- Prefix everything: `sections/custom-*.liquid`, `blocks/custom-*.liquid`, `snippets/custom-*.liquid`, `assets/custom-*.{js,css}`.
- **Standalone data:** read from `section.settings`, `block.settings`, the `product` / `collection` context and metafields. Shrine integration only per the policy above.
- **Presets required:** every custom section schema ships a preset; without one the section cannot be added via "Add section" in the editor.
- **Design tokens:** pull colors, typography and spacing from Shrine's CSS custom properties and color schemes so the merchant can restyle from the editor. Never hardcode brand values.
- **Accept `@app` blocks** in the schema unless there is a concrete reason not to.
- **Document each section** in `docs/sections.md`: designer / Figma link, purpose, exposed settings, Shrine integration points.

### Asset strategy (know what bundles where)

- `{% stylesheet %}` and `{% javascript %}` content is **concatenated across all sections into site-wide files loaded on every page**, whether the section is used or not. Use them only for tiny static bits, with that behaviour in mind.
- Per-instance dynamic CSS from settings → a `{% style %}` block (renders inline, supports Liquid) or a custom property on the section root: `style="--gap: {{ section.settings.gap }}px"`. Never full inline `style` rules.
- Component CSS/JS of any real size → external `assets/custom-<section>.css|js`, loaded from the section via `{{ 'custom-x.css' | asset_url | stylesheet_tag }}` and `<script src="{{ 'custom-x.js' | asset_url }}" defer></script>`. External files cache independently and each gets its own 2 MB crawl budget.

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

## JavaScript

- **Read Shrine's JS before extending it.** Match its architecture; don't impose foreign patterns.
- Custom code lives in `assets/custom-*.js` only, loaded via `script_tag` or `<script src … defer>` from a custom section. Never append to Shrine's files.
- `<script>` tags are `type="module"` or `defer`. No inline blocking scripts beyond Shrine's own layout IIFEs.
- `const` by default, `let` only for genuine reassignment, never `var`. Prefer `for (const x of xs)` over `forEach`. Private methods use `#` syntax.
- Break long tasks (> 50 ms) with `requestIdleCallback` / `scheduler.postTask`. Lazy-init below-the-fold components; no heavy work at module top level.
- Third-party scripts (chat, reviews, analytics, consent) go in app embeds, never hardcoded in Liquid.

## CSS

- Mobile-first per the rules above; container queries for component-level responsiveness.
- Design tokens via CSS custom properties; use Shrine's tokens first. New tokens go on the component root, not `:root`, unless genuinely global.
- Never hardcode colours, fonts or spacing: theme settings drive them via CSS vars.
- Specificity ≤ `0 4 0`; no `!important`, fix the selector instead. BEM-like naming (`.custom-product-card__title--featured`) or custom-element selectors; no broad `div` / `section` selectors.
- Animate `transform` and `opacity` only; never layout-triggering properties.

## Locales & markets

- Primary storefront locale is **`nl`**; `en.default.*` is Shopify's canonical fallback.
- Every customer-facing string goes through settings or `| t`. Deliberate English brand copy (headers, taglines) is a content decision, entered as the setting or locale value, never hardcoded in Liquid.
- New `t:` keys land in `en.default.json` **and** `nl.json` in the same commit; schema keys in both `.schema.json` locales.
- `request.locale.iso_code` / `localization.language.iso_code` can return `nl`, `nl-NL`, `en-GB`: normalise case and match the language part first.
- Multi-market behaviour branches on `localization.country.iso_code` or market metafields, never on locale.

## Accessibility & agent readiness (WCAG 2.2 AA)

Legal floor for EU storefronts since 2025-06-28 (European Accessibility Act). The same rules make the store readable for AI agents, which consume the DOM, the accessibility tree and screenshots rather than pixels alone. Well-structured, semantic, accessible HTML serves both.

- **Semantic HTML first:** `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>` before `<div role="…">`; ARIA is a last resort. Never a `<div>` with only a click handler; if a non-semantic element must be interactive, give it the right `role`, `tabindex` and keyboard handling.
- **Contrast:** text ≥ 4.5:1 (≥ 3:1 for large text); UI components and graphical objects ≥ 3:1. Verify against every merchant color scheme, not just the default.
- **Keyboard:** everything operable. Focus traps only inside modals and drawers (cart drawer, search drawer, megamenu, `<dialog>`), released on `Esc`, focus restored on close. No transparent overlays or `pointer-events` traps left over interactive content.
- **Focus visible and not obscured:** never suppress outlines without a higher-contrast replacement. Use `scroll-margin-top` tied to Shrine's header-height vars so sticky UI can't hide the focused element.
- **Target size:** see Mobile-first rules (44 px primary, 24 px minimum).
- **Dragging alternatives:** comparison sliders, before/afters and swipe carousels get button or arrow-key fallbacks.
- **No redundant entry, accessible auth:** never force re-entry of info already provided in the same flow; no cognitive-puzzle gates on authentication.
- **Labels and names:** `<label for>` paired with every input `id` (plus correct `autocomplete`); icon-only controls get an `aria-label` through `| t`; names describe the action ("Add Energy Foundation to cart", not "Add"); no duplicate accessible names within one view.
- **Structure:** one `<h1>` per page, no skipped heading levels, labelled landmarks (`<nav>`, `<aside>`, `<section>`).
- **Stable layout:** consistent component placement per template; interactive elements don't move after first paint; reserve space for async content.
- **Signal interactivity:** `cursor: pointer` on clickables; visible `:hover` and `:focus-visible` states.
- **Reduced motion:** respect `prefers-reduced-motion` for autoplay, tickers, scroll and view-transition animations.
- **Alt text:** always render merchant-provided `image.alt`; decorative images get `alt=""`, never a missing attribute.
- **Audit the accessibility tree** (DevTools → Accessibility): every interactive node with the correct role, name and state. Fix at the HTML/ARIA level, not the visual layer.
- **JSON-LD is a bonus, not a substitute** for a semantically correct interactive layer.

## Performance (Core Web Vitals)

Hard constraint, not a polish pass. All lab numbers on **mobile emulation** (mid-range Android, Moto G class, throttled network); desktop numbers are informational.

### Budgets

- Field p75: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Above-the-fold byte targets (uncompressed): ≤ 150 KB JS, ≤ 80 KB CSS, ≤ 250 KB images. Shrine's baseline is fixed, so enforce these as deltas: custom work may not push a template over, and any regression vs current live blocks merge (> 2 Lighthouse perf points or any CWV).
- Field data: PageSpeed Insights (CrUX) and Admin → Online Store → Themes → Theme performance.

### Images (single source of truth)

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

### Fonts

- Shopify-hosted fonts (`font_picker` + `font_face`): CDN-served, subsettable. No Google Fonts, Typekit or other third-party hosts.
- `font-display: swap` on every `@font-face`; preload only the critical weight(s) above the fold; subset to `latin` unless `latin-ext` is actually used.
- `size-adjust` / `ascent-override` / `descent-override` on fallback faces to eliminate font-swap CLS.

### Layout stability

- Explicit dimensions or `aspect-ratio` on every `<img>`, `<video>`, `<iframe>`, `<model-viewer>`.
- Reserve space (`min-height`) for banners, cookie bars and review widgets; never inject above existing content after load.
- Sticky offsets come from Shrine's header-height CSS vars, never hardcoded pixels.

### Third-party apps

- After images, the #1 regression source. Measure Lighthouse with each app embed on vs off; push back when an app costs more than ~10 perf points.
- Uninstalled apps leave script tags behind: grep `layout/` and `snippets/` for orphaned references when an app is removed.

### Network

- Preconnect sparingly; Shrine already preconnects `cdn.shopify.com` in `theme.liquid`. Add others only if actually used.
- Avoid redirect chains: every 301/302 is a round trip. Check for SEO-app redirect chains.

## SEO: HTML size (the 2 MB rule)

Googlebot's indexing pipeline processes only the **first 2 MB of uncompressed HTML**; the rest is silently dropped, with no Search Console warning. The URL Inspection Tool uses the 15 MB fetching crawler and will not show it, so never trust it to confirm full indexing. External CSS and JS files each get their own 2 MB budget (PDFs 64 MB). Compression does not help: the limit is measured on uncompressed bytes. Highest-risk on this stack: inline filter/variant JSON blobs, large metaobject lists, Base64 images, app-injected inline code, infinite-scroll DOM growth.

### Thresholds (uncompressed, measured on the largest realistic page: PLP with all filters open, longest PDP, longest article, full homepage)

| Threshold | Status | Action |
|---|---|---|
| < 500 KB | Safe | Ship |
| 500 KB – 1.5 MB | Watch | Document why, plan reduction |
| 1.5 – 2 MB | Critical | Block release until reduced |
| > 2 MB | Fail | Truncation guaranteed, do not ship |

### Source order (if truncation hits, the top survives)

1. **First 100 KB:** `<head>` with meta, canonical, hreflang; **JSON-LD in `<head>`** (never before `</body>`); `<h1>` and intro copy; critical CSS if inline.
2. **First ~1 MB:** main content, all H2/H3 headings, most important internal links, above-the-fold elements.
3. **Rest:** related items, sidebars, reviews, comments, non-critical UI.

### Rules

- No `<style>` blocks beyond a < 14 KB critical-CSS inline; no inline JS bundles (tracking snippets are fine). Component CSS/JS goes external per the Asset strategy.
- JSON-LD complete and in `<head>`; a truncated block invalidates the entire schema. Watch `Product` with many variants, `FAQPage`, `BreadcrumbList` and review aggregations.
- DOM ≤ 1500 nodes per page; flag any section shipping > 200 nodes; no wrapper-in-wrapper soup.
- Collection filters rendered as an inline JSON blob: measure on a large collection; refactor to Section Rendering API / Storefront API fetches when it balloons.
- Metaobject lists: render only what the page needs above the fold, defer the rest.
- Localized content must not push critical content past the priority lines above.

## Definition of Done

One checklist, three owners. A and B are Claude's; C is human-only and Claude never claims those checks.

### A. Claude runs before presenting work

- [ ] `shopify theme check` passes; MCP `validate_theme` passes (plus `validate_graphql_codeblocks` / `validate_component_codeblocks` where relevant).
- [ ] No Shrine core file edited, or: bracketed hook plus `docs/changes.md` entry.
- [ ] All new files `custom-` prefixed; custom sections have a preset; `@app` accepted or a reason stated.
- [ ] Every new `t:` key present in `en.default.json` **and** `nl.json` (plus both schema locales).
- [ ] Semantics: interactive elements semantic (or role + tabindex + keyboard handling); labels wired to inputs; descriptive accessible names; icon buttons have `| t` aria-labels.
- [ ] Images: `image_url` / `image_tag`, dimensions set, correct eager/lazy split, `sizes` reasoned from mobile.
- [ ] HTML size proxy on the largest affected template via the dev server: `curl -s http://127.0.0.1:9292/<path> | wc -c` stays under 500000.
- [ ] `docs/sections.md` / `docs/changes.md` updated where applicable.

### B. Claude verifies when browser tooling is available (otherwise flag as open)

- [ ] Screenshot review at 390×844 first, then desktop: layout stable, targets ≥ 44 px, no hover-only paths, focus visible.
- [ ] Accessibility-tree spot check on new or changed components.

### C. Human, before publish

- [ ] Lighthouse on affected templates, live vs branch, mobile emulation: more than 2 perf points down or any CWV regression blocks.
- [ ] DevTools Network → Doc: uncompressed size < 500 KB on key templates.
- [ ] Tame the Bots fetch & render with "Cap text to 2 MB" and Googlebot Mobile UA: full content visible after the cap.
- [ ] Mueller test with a sentence from the top **and** the bottom (`site:domain "exact quote"`); top found + bottom missing = truncation.
- [ ] Response-vs-rendered HTML diff (AI crawlers often skip JS).
- [ ] Screaming Frog crawl, sort by size descending, review URLs > 1 MB.
- [ ] Rich Results Test on the largest page: schema parses without truncation errors.
- [ ] Publish-swap from the admin.

## Do not

- Edit Shrine core files in place (beyond sanctioned `theme.liquid` hooks).
- Reimplement Shrine's commerce logic; install third-party apps for features Shrine ships.
- Add JS frameworks or libraries; invent Liquid filters, tags or objects.
- Format currency, dates or translated strings in JavaScript.
- Hardcode colours, fonts, spacing or customer-facing copy.
- Write metafields from the theme; construct metafield keys dynamically.
- Use `!important`; write desktop-first `max-width` overrides; use `100vh` for full-height mobile UI; ship hover-only interactions.
- Reach for JS where CSS suffices (e.g. `ResizeObserver` instead of container queries).
- Inline Base64 images; place JSON-LD outside `<head>`; inline JS bundles.
- Ship a `t:` key without its `nl.json` value.
- Push to a live theme; hand-edit `settings_data.json`; run `shopify theme publish` from CLI.
- Add third-party `<script>` tags directly to Liquid; route them through app embeds.

## Tooling & escalation

- Liquid, schemas, sections/blocks/snippets → `shopify-plugin:shopify-liquid` skill (authoritative for schema and section/block rules).
- Admin/Storefront GraphQL, Functions, extensions → the matching `shopify-plugin:*` skill over web search.
- Shrine specifics → shrine.io docs and changelog. If unreachable, read the actual source file being extended. Never guess at Shrine internals.

## Further reading

- web.dev: Introduction to agents · Build agent-friendly websites · The accessibility tree
- Shrine docs & changelog: https://shrine.io
