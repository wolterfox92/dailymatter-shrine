---
paths:
  - "assets/**/*.css"
  - "sections/**/*.liquid"
  - "blocks/**/*.liquid"
  - "snippets/**/*.liquid"
---

# Mobile-first & CSS

## Mobile-first

- **Baseline viewport 390×844.** Build and review there first, then 768 / 1024 / 1440. Mobile always leads the test order.
- **CSS scales up, never down.** Base styles are mobile; enhance via `min-width` media queries or container queries. Desktop-first `max-width` overrides are an anti-pattern: refactor on sight.
- **Viewport units:** `dvh` / `svh` instead of `100vh` for full-height sections and drawers (mobile URL bar). `env(safe-area-inset-*)` on sticky bars and fixed footers (iOS).
- **Touch targets:** primary actions (add-to-cart, quantity steppers, swatches, close buttons) ≥ **44×44 px**; absolute minimum 24×24 px (WCAG 2.5.8). This is the single source of truth for hit sizes.
- **No hover-only interactions.** Quick-add, menus and reveals work on tap and focus; hover is an enhancement. Every available action has a visible, discoverable element.
- **Images:** reason `sizes` from `100vw` on mobile outward. Serve a separate mobile crop via `<picture>` or Shrine's mobile image settings where the composition demands it.
- **Schema:** where mobile layout differs, expose explicit mobile settings (mobile image, mobile spacing/alignment), mirroring Shrine's own patterns.
- **Sticky elements** take their offsets from Shrine's header-height CSS vars; combined sticky UI must not eat the mobile viewport.

## CSS

- Container queries for component-level responsiveness.
- Design tokens via CSS custom properties; use Shrine's tokens first. New tokens go on the component root, not `:root`, unless genuinely global.
- Never hardcode colours, fonts or spacing: theme settings drive them via CSS vars.
- Specificity ≤ `0 4 0`; no `!important`, fix the selector instead. BEM-like naming (`.custom-product-card__title--featured`) or custom-element selectors; no broad `div` / `section` selectors.
- Animate `transform` and `opacity` only; never layout-triggering properties.
- Prefer CSS over JS where it suffices (e.g. container queries instead of `ResizeObserver`).
