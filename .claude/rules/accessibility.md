---
paths:
  - "sections/**/*.liquid"
  - "blocks/**/*.liquid"
  - "snippets/**/*.liquid"
  - "layout/**"
---

# Accessibility & agent readiness (WCAG 2.2 AA)

Legal floor for EU storefronts since 2025-06-28 (European Accessibility Act). The same semantic, accessible HTML serves AI agents, which consume the DOM, the accessibility tree and screenshots rather than pixels alone.

- **Semantic HTML first:** `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>` before `<div role="…">`; ARIA is a last resort. Never a `<div>` with only a click handler; if a non-semantic element must be interactive, give it the right `role`, `tabindex` and keyboard handling.
- **Contrast:** text ≥ 4.5:1 (≥ 3:1 for large text); UI components and graphical objects ≥ 3:1. Verify against every merchant color scheme, not just the default.
- **Keyboard:** everything operable. Focus traps only inside modals and drawers (cart drawer, search drawer, megamenu, `<dialog>`), released on `Esc`, focus restored on close. No transparent overlays or `pointer-events` traps left over interactive content.
- **Focus visible and not obscured:** never suppress outlines without a higher-contrast replacement. Use `scroll-margin-top` tied to Shrine's header-height vars so sticky UI can't hide the focused element.
- **Target size:** 44 px primary, 24 px minimum (single source of truth: `mobile-css.md`).
- **Dragging alternatives:** comparison sliders, before/afters and swipe carousels get button or arrow-key fallbacks.
- **No redundant entry, accessible auth:** never force re-entry of info already provided in the same flow; no cognitive-puzzle gates on authentication.
- **Labels and names:** `<label for>` paired with every input `id` (plus correct `autocomplete`); icon-only controls get an `aria-label` through `| t`; names describe the action ("Add Energy Foundation to cart", not "Add"); no duplicate accessible names within one view.
- **Structure:** one `<h1>` per page, no skipped heading levels, labelled landmarks (`<nav>`, `<aside>`, `<section>`).
- **Stable layout:** consistent component placement per template; interactive elements don't move after first paint; reserve space for async content.
- **Signal interactivity:** `cursor: pointer` on clickables; visible `:hover` and `:focus-visible` states.
- **Reduced motion:** respect `prefers-reduced-motion` for autoplay, tickers, scroll and view-transition animations.
- **Alt text:** always render merchant-provided `image.alt`; decorative images get `alt=""`, never a missing attribute.
- **Audit the accessibility tree** (DevTools → Accessibility) on new or changed components: correct role, name and state. Fix at the HTML/ARIA level, not the visual layer.
- **JSON-LD is a bonus, not a substitute** for a semantically correct interactive layer.
