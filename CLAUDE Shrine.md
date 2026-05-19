# playground-shopify

A single-store Shopify project running **Shrine Theme Pro v1.7.0** (Shrine Solutions — https://shrine.io). Shrine is a closed-source premium theme: there is no public upstream git remote to merge against, and updates come through Shrine's own update mechanism, which can overwrite files wholesale. This file exists so Claude Code makes safe, additive changes that survive theme updates.

> **The single most important rule:** never edit Shrine core files in place. Every customization is additive — new prefixed files, extension points, app embeds, or metafields. A theme update should never destroy custom work.

## Core principles

Reject any change that violates these.

1. **Additive over invasive.** Never edit Shrine core files. Add new files (with the `custom-` prefix) or use Shopify's extension points. A theme update should never destroy custom work.
2. **Custom design is the job; don't reimplement commerce logic.** Building bespoke sections for unique visual/UX work — designer-produced hero sections, story scrolls, editorial layouts, custom PDPs — is exactly what custom code is for. Build them. But when a section needs commerce functionality (cart actions, bundle pricing, upsell triggers, quantity-break math, megamenu data model), call into Shrine's existing primitives rather than reimplementing them. Your section provides the design; Shrine provides the commerce plumbing. The whole point of paying for Shrine is to avoid both third-party app subscriptions *and* having to reinvent the commerce wheel.
3. **Server-rendered.** HTML, translations, money formatting are Liquid on the server — never reconstructed in JS.
4. **Lean, fast, reliable.** Default new features to "no" until they've earned their place. A regression in Core Web Vitals blocks merge.
5. **Functional, not pixel-perfect.** Semantic markup + progressive enhancement over per-browser tweaks.

## Layout

Standard Online Store 2.0 structure. Shrine sticks to Shopify's canonical seven folders — don't invent new top-level folders.

- `layout/` — `theme.liquid` (global shell), `password.liquid`. Edits here are at the highest risk on update; keep them minimal and bracket them with `CUSTOM-START` / `CUSTOM-END` comment markers (see Upgrade safety).
- `templates/` — JSON templates + any legacy Liquid templates Shrine ships.
- `sections/` — section Liquid files. Shrine 1.7.0 ships ~44 sections; custom sections go alongside with the `custom-` prefix.
- `blocks/` — theme blocks (OS 2.0). Custom blocks get the `custom-` prefix.
- `snippets/` — reusable Liquid partials rendered via `{% render 'name' %}`.
- `assets/` — JS, CSS, SVG, fonts. Flat directory (Shopify requirement).
- `config/` — `settings_schema.json` (editor schema), `settings_data.json` (merchant values; don't hand-edit, gitignore unless syncing deliberately).
- `locales/` — `*.json` storefront strings; `*.schema.json` editor strings. `en.default.*` is canonical.

## Upgrade safety (the most important section in this file)

Shrine Pro is closed-source. Updates come through Shrine's own update mechanism, which **does not respect your edits**. Treat every customization as something that has to survive — or be cleanly re-applied to — the next update.

### Hard rules

- **Never edit Shrine core files in place.** Not snippets, not sections, not blocks, not assets, not `layout/theme.liquid`.
- **Copy, then modify.** If a core file's behaviour must change, copy it with the `custom-` prefix (`custom-product-card.liquid`) and reference the copy from your custom template/section.
- **Prefix every custom file.** Pick `custom-` as the project prefix and stick to it: `custom-*.liquid`, `custom-*.js`, `custom-*.css`. This guarantees an updater can't collide with your work.
- **Track every unavoidable core edit in `docs/changes.md`** — date, file path, reason, exact diff. Before every Shrine update, audit this file.
- **Git is non-negotiable.** Theme lives in git. Commit after every change. Branches: `feature/…`, `fix/…`, `chore/…`. Commits imperative + scoped (`Add sticky add-to-cart to product section`).

### Extension-point order of preference

Always try these in order before touching files:

1. Theme settings + section/block settings in the editor.
2. App embeds and app blocks (for cross-cutting features — analytics, chat, reviews).
3. Metafields + metaobjects (for product/page-scoped data).
4. New custom sections/blocks added alongside Shrine's, never overwriting them.
5. Snippets rendered from custom sections — not from core Shrine sections.
6. Last resort: a `custom-`prefixed copy of a core file.

### The Shrine update workflow

Updates from Shrine can replace files wholesale. Follow this sequence every time:

1. **Snapshot current live state into git.** `shopify theme pull --live` into a fresh branch. Commit as `chore: snapshot before shrine update vX.Y.Z`.
2. **Duplicate the live theme in the Shopify admin** as a backup (Online Store → Themes → Actions → Duplicate). Name it `Pre-update backup YYYY-MM-DD`. This is your rollback.
3. **Apply the Shrine update on a separate duplicate** (the test copy). Never on live, never on the backup.
4. **Pull the updated theme into a new git branch** and diff against the snapshot from step 1. Review every file Shrine changed.
5. **Re-apply tracked core edits** from `docs/changes.md` to the updated theme. Commit each one with the changelog entry referenced.
6. **Test critical flows** on the test theme: homepage, PDP, cart drawer, checkout button, megamenu, bundles, search, mobile.
7. **Lighthouse the test theme vs current live.** Any > 2 Perf-point regression or any CWV regression blocks the publish-swap.
8. **Publish-swap from the admin** once sign-off is in. Never `shopify theme publish` from CLI.

### One small hook in `theme.liquid` is acceptable

For meta tags, structured data, or scripts that genuinely cannot live in an app embed. Bracket them so re-application after an update is mechanical:

```liquid
{%- comment -%} CUSTOM-START: GA4 enhanced ecommerce — see docs/changes.md#ga4 {%- endcomment -%}
…
{%- comment -%} CUSTOM-END: GA4 {%- endcomment -%}
```

Every bracketed block must have a matching entry in `docs/changes.md`.

## Shrine native features (commerce primitives to integrate with)

Shrine Pro 1.7.0 ships these commerce features built-in. When a custom section needs any of them, **call into Shrine's existing data and JS** rather than reimplementing — your section provides the design, Shrine provides the commerce plumbing.

- **Cart drawer** — upsells, free-gift thresholds, progress bar, discount field, cart notes, payment badges.
- **Product bundles** with bundle pricing and grouping.
- **Quantity breaks / volume discounts** on the product page.
- **Mega menu** with images and multi-column dropdowns.
- **Comparison tables** for variants and products.
- **Tickers and announcement bars** (horizontal + vertical).
- **MP4 video upload** directly into product/section media — no YouTube/Vimeo embed.
- **Countdown timers, trust badges, payment icons, scroll animations.**
- **Section "connection" grid** — link any two sections into a combined layout.

**Two distinct work modes for these features:**

- **Pure use** — merchant wants stock bundles / stock cart drawer / stock megamenu with no design changes. Configure in the editor, don't write code. A custom-built copy costs theme-update safety AND duplicates work that already exists.
- **Design integration** — the designer's custom section incorporates one of these features (e.g. a bespoke PDP layout that uses Shrine's cart drawer, or a custom story-scroll section that promotes a Shrine-configured bundle). Build the design as a `custom-*` section; call into Shrine's existing JS / Liquid APIs for the commerce part. Inspect Shrine's `assets/` JS to find event names, data attributes, and helper functions to call. Don't reimplement bundle pricing math, cart mutation flows, or megamenu data structures — those are Shrine's job.

A direct corollary: **do not install third-party apps** for the commerce features Shrine already ships. That was a key reason to choose Shrine.

## Custom sections (most of the design work)

This store is being built with a designer producing bespoke layouts that go beyond Shrine's stock sections. **Custom sections are the normal mode of work, not the exception.** The "never edit in place" rule is about Shrine's files — your own `custom-*` sections are yours to edit freely.

Rules for how custom sections are structured so they survive Shrine updates and stay performant:

- **Every new section file gets the `custom-` prefix.** A designer's hero, story-scroll, editorial collection grid, bespoke PDP layout — each gets its own `sections/custom-*.liquid` file. Same for blocks (`blocks/custom-*.liquid`), snippets (`snippets/custom-*.liquid`), assets (`assets/custom-*.{js,css}`).
- **Standalone first.** A `custom-` section reads its data from `section.settings`, `block.settings`, the `product` / `collection` context, and metafields. It does not reach into Shrine's internal JS/Liquid helpers unless those are part of Shrine's documented public surface.
- **Integrate with Shrine's commerce primitives where needed.** Add-to-cart buttons in a custom PDP layout should dispatch the same events Shrine's own buttons dispatch — inspect Shrine's cart drawer JS first to find the event names and payload shape. A custom section promoting a bundle should read the bundle data Shrine exposes, not query Shopify directly.
- **Self-contained assets.** Section-scoped critical CSS in a `{% stylesheet %}` block inside the section file; shared CSS in `assets/custom-<section>.css` loaded via `{{ 'custom-<section>.css' | asset_url | stylesheet_tag }}`. Same for JS: `{% javascript %}` block for small, section-scoped logic; `assets/custom-<section>.js` for anything bigger.
- **Use Shrine's design tokens.** Pull colors, typography, spacing from Shrine's CSS custom properties / color schemes so the section visually matches the rest of the store and the merchant can re-theme from the editor. Don't hardcode brand values.
- **Accept `@app` blocks** in the section schema unless there's a concrete reason not to.
- **Render fast.** Apply every rule in the Performance section — image sizing, lazy loading, ≤ 1500 DOM nodes, etc. A custom section is the most common place to accidentally tank Lighthouse.
- **Document each custom section** in `docs/sections.md` with: designer name / Figma link, what it does, which settings it exposes, which Shrine primitives it integrates with. This keeps the next update review tractable.

## Liquid conventions

- **Never invent filters, tags, or objects.** Hallucinated Liquid APIs are the #1 AI failure mode here. If uncertain, check via the `shopify-plugin:shopify-liquid` skill or the Shopify Dev MCP — don't guess.
- **Prefer `{% render %}` over `{% include %}`** — `include` is deprecated; `render` has sandboxed scope.
- **LiquidDoc (`{%- doc -%} ... {%- enddoc -%}`) in snippets and blocks** — not in sections (sections are documented via schema).
- **Respect object scope.** Inside a block, use `block.settings.x`; inside a section, `section.settings.x`. `product`, `collection`, `cart`, etc. are context-specific.
- **Check existence before output:** `{% if product.metafields.custom.tagline != blank %}…{% endif %}`.
- **Translations + money formatting are server-side.** `{{ 'key' | t }}`, `{{ amount | money }}`, `{{ date | time_tag }}`. Never reconstruct these in JS.
- **Schema translation keys** (`t:settings.foo`, `t:content.bar`) must be added to `locales/en.default.schema.json` at minimum; other `*.schema.json` locales mirror. `visible_if` drives conditional fields — check existing Shrine patterns before adding new visibility logic.
- **Asset references** use `{{ 'file.js' | asset_url }}` / `| stylesheet_tag` / `| script_tag`.

## Schema best practices

- **Rich setting types over raw text:** `image_picker` (not `url`), `color`, `color_scheme`, `product` / `collection` / `blog` pickers, `range` for bounded numbers.
- **Always localise labels** via `t:…` keys — never hardcode English.
- **Accept `@app` blocks** in section schemas so merchant apps can inject blocks: `"blocks": [{ "type": "@app" }, ...]`.
- **Match Shrine's existing schema patterns.** If Shrine uses certain setting groupings, presets, or naming conventions, mirror them in custom sections — keeps the editor experience consistent.

## Metafields

- Themes **read** metafields, never **write** them (admin/apps/Shopify Flow are the source of truth).
- Use known static keys: `product.metafields.custom.tagline`. No dynamic key construction.
- Always check `!= blank` before rendering.
- Values capped at 16 KB; truncation is a data issue, not a theme issue.
- Document every namespace/key the theme depends on in `README.md`.
- Shrine ships its own metafield-driven features for some sections. Check Shrine docs before defining new namespaces that might overlap with Shrine's.

## JavaScript

- **Read Shrine's existing JS before extending it.** Shrine ships its own architecture; don't impose foreign patterns. If extending a Shrine component (cart drawer, megamenu, variant picker), inspect how Shrine dispatches and listens for events first.
- **Zero new external dependencies.** No React, Vue, Svelte, Alpine, jQuery, Swiper, Slick, GSAP. Reach for native: `<details>`, `popover`, `<dialog>`, `IntersectionObserver`, container queries, CSS scroll-snap, native form validation.
- **Custom JS lives in prefixed asset files** (`custom-*.js`) loaded from a custom section's `{% javascript %}` block or via `script_tag` from a custom section. Don't add custom code to Shrine's existing JS files.
- **`const` by default, `let` only for genuine reassignment, never `var`.** Prefer `for (const x of xs)` over `forEach`. Private methods use `#` private-field syntax.
- **`<script>` tags are `type="module"` or `defer`.** No inline blocking scripts.
- **Cart mutations:** optimistic UI update → roll back with a visible error on API failure → fire whatever cart-refresh event Shrine listens to (inspect `assets/` to find Shrine's event names; don't invent your own and assume Shrine will react). Never hard-redirect to `/checkout` from JS; use the standard checkout button.
- **Defer / lazy load below-the-fold work.** Break long tasks (> 50 ms) with `requestIdleCallback` / `scheduler.postTask`.
- **Translations, money, dates: always server-side Liquid.** Never `Intl.NumberFormat` for prices in customer-facing flows.

## CSS

- **Mobile-first + container queries (`@container`)** for component responsiveness. Prefer container queries over media queries for component-level logic.
- **Design tokens via CSS custom properties.** Use Shrine's existing tokens (defined in theme settings → exposed as CSS variables) before defining new ones. New tokens go on the component root, not `:root`, unless they're genuinely global.
- **Never hardcode colours, fonts, or spacing.** Shrine's theme settings drive these via CSS vars; use them. Hardcoding means the merchant can't restyle from the editor and breaks brand consistency.
- **Custom CSS lives in prefixed files** (`custom-*.css`) loaded via `stylesheet_tag`, or inlined per-section via `{% stylesheet %}` blocks for critical CSS (target < 14 KB inline).
- **Specificity ≤ `0 4 0`.** No `!important` — fix the selector instead.
- **BEM-like (`.custom-product-card__title--featured`)** or custom-element tag selectors. Avoid broad `div` / `section` selectors.
- **Dynamic values from schema settings** are acceptable as custom properties injected inline (`style="--gap: {{ block.settings.gap }}px"`), but never as full inline `style` rules.
- **Animate `transform` and `opacity` only** — never layout-triggering props (`width`, `top`, `height`).

## Locales and translations

- Every customer-facing string goes through `| t`. No hardcoded copy in any language.
- `request.locale.iso_code` / `localization.language.iso_code` can return `nl`, `nl-NL`, `en-GB`. Normalise case and match on the language portion first before full match.
- For **multi-market** behaviour, branch on `localization.country.iso_code` or market metafields — not on locale.

## Accessibility — WCAG 2.2 AA

All storefront-facing changes must meet WCAG 2.2 Level AA. The EU Accessibility Act (in force since 2025-06-28) makes this a legal floor for European storefronts.

- **Contrast (1.4.3 / 1.4.11):** text ≥ 4.5:1 (≥ 3:1 for ≥ 18pt or 14pt bold); UI components and graphical objects ≥ 3:1. Verify against every merchant color scheme, not just the default.
- **Keyboard (2.1.1, 2.1.2):** all interactive elements operable via keyboard. Focus traps are permitted only inside modal dialogs and must release on `Esc`. The cart drawer, search drawer, mega menu, and any `<dialog>` must trap + restore focus.
- **Focus visible + not obscured (2.4.7, 2.4.11 — new in 2.2):** never suppress focus outlines without a higher-contrast replacement. When the sticky header, cart bubble, or announcement bar is on screen, the focused element must not be fully hidden — use `scroll-margin-top` / `scroll-padding-top` tied to the header-height CSS vars Shrine sets in `theme.liquid` (don't hardcode; inspect Shrine's setup first).
- **Target size (2.5.8 — new in 2.2):** interactive targets ≥ 24×24 CSS px with spacing if smaller. Prefer a stricter **44×44** budget for primary actions — quantity steppers, swatch chips, close buttons, social icons.
- **Dragging alternatives (2.5.7 — new in 2.2):** any drag-driven UI (comparison sliders, before/after sliders, drag-to-zoom, swipe-only carousels) needs a non-drag fallback (buttons, arrow keys).
- **Redundant entry + accessible auth (3.3.7, 3.3.8 — new in 2.2):** don't force re-entry of info already provided in the same flow; don't gate auth on cognitive puzzles.
- **Semantic HTML first.** `<button>`, `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` before `<div role="…">`. ARIA is a last resort.
- **Names/roles/values (4.1.2):** every custom element has an accessible name. Icon-only buttons get an `aria-label` routed through `| t`, never hardcoded English.
- **Landmarks & headings (1.3.1, 2.4.6):** one `<h1>` per page, no skipped levels. Use `<section>`/`<nav>`/`<aside>` with labels.
- **Reduced motion (2.3.3):** respect `prefers-reduced-motion` for slideshow autoplay, marquee/ticker animations, view transitions, scroll animations.
- **Alt text:** always render merchant-provided `image.alt`. Decorative images get `alt=""`; never omit the attribute.

## Performance — Core Web Vitals & PageSpeed

Treat performance as a hard constraint, not a polish pass.

### Budgets

Ship against concrete numbers. Regressions require explicit sign-off.

- **Core Web Vitals (field, p75):** **LCP ≤ 2.5 s**, **INP ≤ 200 ms**, **CLS ≤ 0.1**.
- **Lighthouse (lab, mobile throttling):** Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- **Byte budget above-the-fold (uncompressed):** ≤ 150 KB JS, ≤ 80 KB CSS, ≤ 250 KB images.
- **Target device:** mid-range Android (Moto G Power class) on throttled 3G/slow-4G — not an M-series laptop on fibre.

### Images (biggest lever)

- **Always use `image_url` + `image_tag`** — never `<img src="{{ image.src }}">`. The CDN handles WebP/AVIF and responsive variants.
- **Always set `width` and `height`** (or enforce `aspect-ratio`). Missing dimensions = CLS.
  ```liquid
  {{ image | image_url: width: 1200 | image_tag:
     width: image.width, height: image.height,
     sizes: '(min-width: 750px) 50vw, 100vw',
     widths: '375, 550, 750, 1100, 1500, 2200',
     loading: 'lazy' }}
  ```
- **LCP image (hero / first PDP image / first slide) = `loading="eager"` + `fetchpriority="high"` + `<link rel="preload">`** from `theme.liquid` at the exact width the browser will pick.
- All other images: `loading="lazy"` + `decoding="async"`.
- Accurate `sizes` — a wrong `sizes` makes `widths` pointless.
- Don't rely on the CDN to downscale 4000 px source files; upload at ≤ 2400 px on the long edge.

### Fonts

- Prefer Shopify-hosted fonts (`font_picker` + `font_face` filter) — CDN-served, subsettable.
- `font-display: swap` on every `@font-face`. Never `block` or `auto`.
- Preload **only** the critical weight(s) above the fold — one body + one display is usually enough.
- Subset to `latin` unless the store actually uses `latin-ext`.
- Use `size-adjust` / `ascent-override` / `descent-override` on fallback `@font-face` to eliminate font-swap CLS.
- No third-party font hosts (Google Fonts, Typekit, Adobe).

### JS

- `<script>` tags are `type="module"` or `defer`. No inline blocking scripts beyond Shrine's existing header-height / layout setup IIFEs.
- Break long tasks (> 50 ms) with `requestIdleCallback` / `scheduler.postTask`.
- Lazy-load below-the-fold custom code — don't eagerly initialise heavy components at module top-level.
- **Third-party scripts belong in app embed blocks**, not in Liquid — chat widgets, reviews, analytics, trust badges. Don't hardcode them in `theme.liquid`.

### Layout stability (CLS)

- Every `<img>`, `<video>`, `<iframe>`, `<model-viewer>` has explicit dimensions or `aspect-ratio`.
- Reserve space for banners, cookie bars, review widgets with `min-height`. Don't inject content above existing content after load.
- Sticky-header height is exposed via CSS vars that Shrine sets — use those for scroll offsets and reserved space, don't hardcode pixels.

### Third-party apps (silent killer)

- After images, apps are the #1 perf regression source. Audit every app embed: measure Lighthouse with it off vs on.
- Uninstalled apps leave script tags behind — grep `layout/` and `snippets/` for orphaned references when a merchant removes an app.
- Push back when an app costs > ~10 Perf points.
- **Reminder:** Shrine already ships cart upsells, bundles, megamenu, countdowns, trust badges, comparison tables. Don't install third-party apps for these.

### Network

- Preconnect sparingly. Shrine already preconnects `cdn.shopify.com` in `theme.liquid`. Add others only if actually used.
- Avoid redirects — every 301/302 is a round trip. Check for SEO-app redirect chains.

### Measuring

- Lighthouse against the dev/test preview before claiming a perf task done.
- `shopify theme check` catches common perf anti-patterns — run before commit.
- Field data: PageSpeed Insights (CrUX) + Admin → Online Store → Themes → Theme performance.
- Before shipping non-trivial changes: Lighthouse the affected template on current live vs branch. > 2 perf points regression or any CWV regression blocks the merge.

## Dev workflow

- **Shopify CLI 3.x:** `shopify theme dev`, `shopify theme push --unpublished`, `shopify theme pull`, `shopify theme check`.
- **Pull live as baseline.** `shopify theme pull --live` into git before any work. Commit.
- **Develop locally** with `shopify theme dev` against an unpublished development theme.
- **Push to a fresh `--unpublished` theme** on the production store for QA.
- **Publish-swap from the Shopify admin**, never `shopify theme publish` from CLI.
- **Never push to a live theme.** Period.
- For Shrine updates: see the Shrine update workflow above.
- Use `.shopifyignore` to keep files off the remote.
- `config/settings_data.json` is live merchant state — gitignore it unless you have a deliberate sync strategy.

## Tooling

- **Editing Liquid, schemas, or sections/blocks/snippets → `shopify-plugin:shopify-liquid` skill** (authoritative schema + block/section rules).
- For Admin/Storefront GraphQL, Functions, extensions → matching `shopify-plugin:*` skill over web search.
- `mcp__shopify-dev-mcp__validate_theme` lints theme changes; `validate_graphql_codeblocks` / `validate_component_codeblocks` validate code snippets before shipping.
- **For Shrine-specific questions:** consult shrine.io docs and the Shrine changelog. Don't guess at Shrine internals — read the file you're extending first.
- Grep `sections/`, `blocks/`, `snippets/` for existing patterns before inventing new ones — Shrine likely already solves the problem.

## Before editing

1. **Identify the task type.** (a) Pure commerce feature Shrine already ships (stock bundle, stock upsell, stock megamenu, stock cart drawer)? → configure in editor, don't code. (b) Bespoke custom section / design / layout from the designer? → build it as a `custom-*` file. (c) Custom section that needs commerce behavior (e.g. a bespoke PDP that uses Shrine's cart drawer)? → build the design custom, call Shrine's primitives for the commerce part.
2. Read the target file in full — note whether it's a core Shrine file (in which case: don't edit; copy with the `custom-` prefix or use an extension point).
3. Look for an existing pattern (variant picker, quick-add, predictive search, etc.) and match it.
4. Ask clarifying questions for schema design, block nesting, and cross-market behaviour — a question is cheaper than a refactor.
5. Never silently change core-file behaviour. If a core edit is unavoidable, flag it, log it in `docs/changes.md`, and propose the minimum viable change.

## Do not

- Edit Shrine core files in place.
- Reimplement Shrine's commerce logic in custom code — bundle pricing math, cart drawer mutation flow, megamenu data model, quantity-break calculations. Call into Shrine's existing API instead. (Bespoke design *on top of* these primitives is fine and expected.)
- Install third-party apps for commerce features Shrine already ships.
- Add a JS framework or library (React, Vue, Alpine, jQuery, Swiper, Slick, GSAP).
- Invent Liquid filters, tags, or objects.
- Format currency / dates / translated strings in JavaScript.
- Hardcode colours, fonts, spacing, or customer-facing copy.
- Write to metafields from the theme.
- Use `!important` to win a specificity fight.
- Replace container queries with JS `ResizeObserver` "because it's simpler".
- Push to a live theme or hand-edit `settings_data.json`.
- Add third-party `<script>` tags directly to Liquid — route them through app embeds.
- Run `shopify theme publish` from CLI. Publish-swap from the admin.

## Repo state

Git repo for the `playground-shopify` storefront, running **Shrine Theme Pro v1.7.0**. Baseline commit is a `shopify theme pull --live` snapshot. Each Shrine update gets its own branch (`chore/shrine-vX.Y.Z`) for diffability. `docs/changes.md` tracks every unavoidable core edit and must be reviewed before applying any Shrine update.

## How agents perceive a page

Agents do not look at a monitor. They consume a machine-readable representation of the page through three channels, usually combined:

1. **Screenshots** — A vision model interprets the rendered pixels. Useful for layout, grouping, and visual hierarchy (size, color, proximity → importance), but slow and token-expensive. Often used as a fallback when structure is unclear.
2. **Raw HTML / DOM** — The agent reads the nested structure, IDs, classes, attributes, and text content to infer relationships (e.g. a "Buy Now" button inside a product card belongs to *that* product).
3. **Accessibility tree** — A browser-native semantic summary of roles, names, and states. Strips visual noise and exposes pure functional intent. Inspect it via Chrome DevTools → Accessibility panel.

Modern agents cross-reference all three. Our job is to make every channel clean, consistent, and unambiguous.

---

## Coding rules for Claude

When generating, refactoring, or reviewing front-end code in this project, follow these rules. Treat them as defaults; deviate only with a stated reason.

### 1. Use semantic HTML for anything actionable

- Prefer `<button>`, `<a>`, `<input>`, `<select>`, `<label>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` over generic `<div>` / `<span>`.
- If a non-semantic element *must* be interactive, give it the right ARIA role and keyboard affordance:
  ```html
  <div role="button" tabindex="0" aria-label="Add to cart">…</div>
  ```
- Never invent a "button" out of a `<div>` with only a click handler. Agents reading the DOM will not recognize it as actionable.

### 2. Make every action visible in the interface

- Any action a human or an agent can take must be reflected by a visible, discoverable element. No hidden keyboard shortcuts as the only path. No actions that only appear after a hover on desktop.
- If an action is gated by hover, also expose it via focus and via a visible affordance (caret, kebab menu, etc.).

### 3. Keep layout stable

- Agents using screenshots get confused by shifting layouts. Example to avoid: an **Add to cart** button that lives in a different position per product category.
- Use consistent component placement across pages of the same template.
- Avoid CLS (Cumulative Layout Shift). Reserve space for images, embeds, and async content.
- Be careful with animations that move interactive elements after first paint.

### 4. No ghost elements or invisible overlays over interactive content

- Transparent overlays, full-page modals that don't dismiss cleanly, or `pointer-events` traps will cause visual analysis to discard the underlying nodes — even though they look "visible" to a human.
- If an element is interactive, nothing should sit on top of it unless that overlay is itself the intended action.

### 5. Connect labels to inputs

- Always pair `<label for="id">` with the input's `id`. This gives the agent a direct text-to-action mapping instead of guessing from proximity.
  ```html
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" autocomplete="email" />
  ```
- Wrapping the input inside the label works too, but `for`/`id` is the most explicit.

### 6. Signal interactivity in CSS

- Set `cursor: pointer` on anything clickable. It's a strong actionability signal for visual models.
- Provide visible `:hover`, `:focus`, and `:focus-visible` states. Don't kill outlines without replacing them.

### 7. Respect minimum hit-target size

- Interactive elements required to continue a user journey must have a visible area **larger than 8 square pixels** to avoid being filtered out by visual analysis. (Practical floor for humans is closer to 24×24px or 44×44px on touch — use that as the real target.)

### 8. Give elements meaningful names

- Buttons should have human-readable text or an `aria-label` that describes the action ("Add Nike Pegasus 41 to cart"), not just "Add" or an icon alone.
- Icons-only controls require `aria-label`.
- Avoid duplicate accessible names on different controls within the same view.

### 9. Don't fight the accessibility tree

- Audit the page in Chrome DevTools → Elements → Accessibility. Every interactive node should appear with the correct role, name, and state.
- If something is missing or mislabeled there, fix it at the HTML/ARIA level — not by patching the visual layer.

### 10. Structured data is a bonus, not a substitute

- Add JSON-LD / schema.org markup for product, price, availability, breadcrumbs, FAQs, etc. Agents will use it. But it does **not** excuse broken semantics in the interactive layer.

---

## Review checklist

Before considering any UI task done, Claude should verify:

- [ ] All interactive elements use semantic tags or correct `role` + `tabindex`.
- [ ] Every form input has an associated `<label for="…">`.
- [ ] Buttons and links have descriptive accessible names (text content or `aria-label`).
- [ ] No critical interactive element is hidden behind a transparent overlay or absolutely-positioned ghost element.
- [ ] Layout is stable across page loads in the same template; no surprise shifts after first paint.
- [ ] `cursor: pointer` is set on clickable elements; focus styles are visible.
- [ ] Hit targets are at minimum 24×24px (well above the 8 sq-px floor).
- [ ] Accessibility tree in DevTools matches the visual UI — no missing roles, no misleading names.
- [ ] Structured data, where applicable, is present and validates.
- [ ] No Shrine core file was edited in place; all changes are in `custom-`prefixed files or extension points.

---

## Anti-patterns to refuse or rewrite

If asked to produce any of the following, Claude should push back and offer the safer alternative:

- A `<div>` with `onClick` and no role/tabindex. → Use `<button>`.
- A "card" that is wrapped in nothing semantic and relies on a JS click handler at the root. → Wrap content in `<a>` or use a button + linked title.
- Modals or drawers that don't trap focus, can't be closed with `Esc`, or leave a transparent overlay over the page.
- Layouts that re-flow late because images, ads, or fonts loaded without reserved space.
- Icon-only controls without `aria-label`.
- Hover-only menus on touch- or agent-driven flows.
- **Editing a Shrine core file directly** instead of copying it with a `custom-` prefix.
- **Reimplementing Shrine's commerce logic** (bundle pricing engine, cart drawer mutation flow, megamenu data model) inside a custom section when calling into Shrine's existing API would do the job. Custom *design* on top of these primitives is encouraged — only the logic underneath should not be duplicated.

---

## Further reading

- web.dev — [Introduction to agents](https://web.dev/articles/ai-agents)
- web.dev — [Build agent-friendly websites](https://web.dev/articles/ai-agent-site-ux)
- web.dev — [The accessibility tree](https://web.dev/articles/the-accessibility-tree)
- Chrome DevTools — [Accessibility tree reference](https://developer.chrome.com/docs/devtools/accessibility/reference#tree)
- Chrome — [WebMCP early preview](https://developer.chrome.com/blog/webmcp-epp)
- Shrine — official docs and changelog at https://shrine.io

---

## Guiding principle

> Everything that makes a site agent-ready also makes it better for humans. Treat agent-friendliness as a recommitment to the web's foundational principles: well-structured, accessible, semantic HTML.

---

## 1. Background — Why the 2 MB rules exist

- Googlebot processes **only the first 2 MB of an HTML document** for Web Search indexing. Anything beyond that is silently dropped — no warning in Search Console, no error in the URL Inspection Tool.
- The **15 MB limit** still applies to fetching, and the URL Inspection Tool uses the fetching crawler. **Do not trust it** to confirm full indexing.
- **External CSS and JS files each have their own 2 MB budget.** PDFs get 64 MB.
- The limit is measured on **uncompressed** bytes — gzip/Brotli does not help.
- Risk groups (relevant to our stack): e-commerce stores with client-side filtering, **Shopify themes with many variants and inline JSON blobs**, SPAs with inline bundles, page-builder sites, Base64-embedded images, infinite-scroll DOM growth.

---

## 2. Hard rules (must pass before staging review)

### 2.1 HTML size budget

| Threshold | Status | Action |
|---|---|---|
| < 500 KB uncompressed | ✅ Safe | Ship |
| 500 KB – 1.5 MB | ⚠️ Watch | Document why, plan reduction |
| 1.5 MB – 2 MB | 🟠 Critical | Block release until reduced |
| > 2 MB | 🔴 Fail | Truncation guaranteed — do not ship |

- Always measure the **uncompressed Resource size** in Chrome DevTools → Network → Doc filter. Never use the "transferred" column.
- Run the check on the **largest realistic page**: PLP with all filters open, longest PDP, longest blog/article, homepage with full content.

### 2.2 Source-code ordering (the "go-bag" principle)

If truncation happens, what's at the top survives. Order every template accordingly:

**Priority 1 — first 100 KB (must-have):**
- `<head>` with meta tags, canonical, hreflang
- **JSON-LD structured data** (move out of `</body>` and into `<head>`)
- `<h1>` and intro copy
- Critical CSS (only if not externalised)

**Priority 2 — first ~1 MB:**
- Main content, all H2/H3 headings
- Most important internal links
- Above-the-fold elements

**Priority 3 — second half (1–2 MB):**
- Related posts, sidebars
- Comments, reviews
- Non-critical UI

**Never inline near the limit:** CSS, JS, Base64 images, page-builder wrapper soup.

### 2.3 Inline code

- **No `<style>` blocks** in templates beyond a small critical-CSS inline (target < 14 KB).
- **No `<script>` blocks with bundle code.** Tracking snippets are allowed; full bundles are not.
- All section/component CSS and JS goes to **external assets** so each file gets its own 2 MB budget.

### 2.4 Structured data (JSON-LD)

- Render JSON-LD **inside `<head>`**, not before `</body>`.
- For Shopify: place JSON-LD in `theme.liquid` `<head>`, or in a snippet rendered from `<head>`. Never let the schema spill into the bottom of `theme.liquid` where it can be cut.
- Special attention for: `Product` schema with many variants, `FAQPage` with many Q&As, `BreadcrumbList`, review aggregations. A truncated JSON-LD block invalidates the **entire** schema, not just the cut part.

### 2.5 Images

- No Base64 / Data-URL images in HTML. Reference external URLs.
- Use **WebP or AVIF** with appropriate fallbacks.
- **Eager load** above-the-fold imagery (`loading="eager"`, `fetchpriority="high"` on the LCP image).
- **Lazy load** everything below the fold (`loading="lazy"`).
- Use Shopify's responsive `image_url` filters with `width:` / `format:` parameters; avoid `img_url` legacy filter.

### 2.6 DOM size

- Target: **< 1500 DOM nodes** per page (Lighthouse threshold).
- Avoid wrapper-in-wrapper markup (`<div><span><span>...`). Use semantic HTML and ask: do I really need this element to render this design?
- Audit Shrine section nesting on every project — flag any section that ships > 200 nodes.

---

## 3. Shopify / Shrine-specific guidance

- **Storefront filters / collection pages:** if filters are rendered as a JSON blob inline (common in Online Store 2.0 themes for client-side filtering), measure the resulting HTML on a category with many products. Refactor to fetch via Section Rendering API or Storefront API instead of inlining the dataset.
- **Metafields/metaobjects:** rendering large metaobject lists directly into HTML can balloon page weight. Render only what the page needs above the fold; defer the rest.
- **Apps:** audit installed apps for inline `<script>` injections and inline style tags. Common culprits: review apps, upsell apps, consent banners, page builders (PageFly, Shogun, GemPages). With Shrine, you should be running fewer of these — features like upsells/bundles/megamenu are native.
- **Localization (Online Store 2.0):** with multiple languages on one storefront, ensure translated content does not get appended in a way that pushes critical content past the 100 KB / 1 MB priority lines.
- **Theme architecture:** prefer external `assets/` files over inline. `{{ 'theme.css' | asset_url | stylesheet_tag }}` over inline `<style>` blocks.

---

## 4. Mandatory pre-delivery checks

Run all of these before publishing the test theme to live:

1. **Chrome DevTools size check** — Network → Doc → Size column → uncompressed value < 500 KB on every key template.
2. **Tame the Bots fetch & render** ([tamethebots.com/tools/fetch-render](https://tamethebots.com/tools/fetch-render)) — enable "Cap text to 2MB" with **Googlebot Mobile** UA. Confirm full content is visible after the cap.
3. **Mueller test** — copy a unique sentence from the bottom of a long page, search `site:domain.com "exact quote"`. If found → indexed in full.
4. **Top-vs-bottom cross-check** — repeat the Mueller test with a sentence from the top. Top-found + bottom-not-found = truncation.
5. **Response vs Rendered HTML diff** — compare server response (no JS) with rendered DOM. Large gaps signal AI-crawler invisibility (ChatGPT, Perplexity, AI Overviews often don't execute JS).
6. **Screaming Frog crawl** — sort by Size desc; flag any URL > 1 MB for review.
7. **JSON-LD validity** — Rich Results Test on the largest page; confirm schema parses with no truncation errors.

Do **not** rely on the Search Console URL Inspection Tool to confirm full indexing — it uses the 15 MB fetching crawler and will lie to you.

---

## 5. Performance / loading defaults

These pair naturally with the size rules:

- Above the fold: **eager load**, `fetchpriority="high"` on the LCP image, preload critical fonts.
- Below the fold: **lazy load** images, iframes, embeds.
- Modern image formats: **WebP / AVIF** with `<picture>` fallback when needed.
- Defer non-critical JS (`defer` or `async`).
- Self-host fonts where possible; subset and preload.
