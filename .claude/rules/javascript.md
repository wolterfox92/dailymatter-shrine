---
paths:
  - "assets/**/*.js"
---

# JavaScript

- **Read Shrine's JS before extending it.** Match its architecture; don't impose foreign patterns.
- Custom code lives in `assets/custom-*.js` only, loaded via `script_tag` or `<script src … defer>` from a custom section. Never append to Shrine's files.
- `<script>` tags are `type="module"` or `defer`. No inline blocking scripts beyond Shrine's own layout IIFEs.
- `const` by default, `let` only for genuine reassignment, never `var`. Prefer `for (const x of xs)` over `forEach`. Private methods use `#` syntax.
- Break long tasks (> 50 ms) with `requestIdleCallback` / `scheduler.postTask`. Lazy-init below-the-fold components; no heavy work at module top level.
- Third-party scripts (chat, reviews, analytics, consent) go in app embeds, never hardcoded in Liquid.
- Never format currency, dates or translated strings in JS (golden rule 7): they come server-rendered from Liquid.
- Cart mutations: optimistic UI update → visible rollback on API failure → fire the cart-refresh event Shrine listens to. Never hard-redirect to `/checkout` from JS; use the standard checkout button.
