# playground-shopify — CLAUDE.md

Single-store Shopify project running **Shrine Theme Pro** (Shrine Solutions, https://shrine.io). Shrine is a closed-source premium theme: no public upstream git remote, and updates come through Shrine's own mechanism, which can overwrite files wholesale. Everything we build must be additive and survive theme updates.

**Store profile:** mobile-first D2C storefront; the majority of traffic is mobile, desktop is the enhancement layer. Primary storefront language is Dutch (`nl`). Deliberate English brand copy (headers, taglines) is allowed as content, never as hardcoded strings.

Detailed conventions live in `.claude/rules/` and load automatically when matching files are touched. The Shrine update procedure is the `shrine-update` skill. Hard bans (publish, live push, core-file edits) are additionally enforced by `.claude/settings.json` permissions and a PreToolUse hook — a blocked action is policy, not a malfunction.

## Versions (single source of truth, update only here)

- Shrine Theme Pro: **v1.7.0** (~44 stock sections)
- Shopify CLI: 3.x
- Update history: `docs/changes.md`

## Golden rules

Non-negotiable. Reject or flag any change that violates one.

1. **Mobile-first.** Design, build and verify at 390×844 first; desktop is the enhancement. Every visual check, screenshot or test list starts mobile.
2. **Never edit Shrine core files in place.** Not sections, snippets, blocks, assets or `layout/`. Sole exception: bracketed `CUSTOM-START/END` hooks in `theme.liquid`, each with a `docs/changes.md` entry.
3. **Additive only.** Every custom file gets the `custom-` prefix (`custom-*.liquid`, `custom-*.js`, `custom-*.css`). A theme update must never destroy custom work.
4. **Design is custom; commerce is Shrine's.** Never reimplement Shrine's commerce logic (bundle pricing math, cart mutation flow, megamenu data model, quantity breaks); integrate via Shrine's events and data attributes.
5. **No third-party apps** for features Shrine already ships: upsells, bundles, megamenu, countdowns, trust badges, comparison tables.
6. **Zero new JS dependencies.** No React, Vue, Svelte, Alpine, jQuery, Swiper, Slick, GSAP. Native platform first: `<details>`, `<dialog>`, `popover`, `IntersectionObserver`, container queries, scroll-snap, native form validation.
7. **Server-rendered.** HTML, translations, money and dates come from Liquid (`| t`, `| money`, `time_tag`). Never reconstructed in JS, never `Intl.NumberFormat` for customer-facing prices.
8. **Never invent Liquid APIs.** Hallucinated filters, tags and objects are the #1 failure mode. Verify via the `shopify-plugin:shopify-liquid` skill or Shopify Dev MCP when uncertain.
9. **Lean by default.** New features default to "no" until they've earned their place. Functional and progressive over pixel-perfect per-browser tweaks.
10. **Performance is a hard constraint.** Budgets apply as deltas for custom work (Shrine's baseline is fixed); any CWV regression vs live blocks merge. Details: `.claude/rules/performance.md`.
11. **Translations ship complete.** Every new `t:` key lands in `en.default.json` **and** `nl.json` (schema keys in both `.schema.json` files) in the same commit.
12. **Never push to a live theme. Never `shopify theme publish` from CLI.** Publish-swap from the Shopify admin only.
13. **Validate before done.** `shopify theme check` and MCP `validate_theme` pass, plus the Definition of Done below.

## Commands & environment

```bash
shopify theme dev --store=30c5a1-2.myshopify.com  # local dev server on 127.0.0.1:9292
shopify theme check                               # lint, run before every commit
shopify theme pull --live                         # snapshot live into git (baseline)
shopify theme push --unpublished                  # fresh QA theme, never live
```

- Store: `30c5a1-2.myshopify.com`.
- QA convention: push to a fresh unpublished theme named `QA YYYY-MM-DD <feature>`. Never reuse live or the backup theme.
- `config/settings_data.json` is live merchant state: gitignored unless deliberately syncing, never hand-edited.
- `.shopifyignore` keeps local-only files off the remote.
- Repo baseline is a `pull --live` snapshot. Each Shrine update gets its own branch `chore/shrine-vX.Y.Z`. Branches: `feature/…`, `fix/…`, `chore/…`. Commits imperative and scoped (`Add sticky add-to-cart to product section`). Commit after every change.

## Layout (Online Store 2.0, canonical folders only)

`layout/` (`theme.liquid`, `password.liquid`; highest update risk, hooks only) · `templates/` (JSON templates) · `sections/` (Shrine stock + `custom-*`) · `blocks/` (theme blocks, `custom-*` for ours) · `snippets/` (partials via `{% render %}`) · `assets/` (flat, Shopify requirement) · `config/` · `locales/` (`en.default.*` canonical fallback, `nl` primary). Don't invent new top-level folders.

## Task router (before touching anything)

1. **Type the task:** (a) stock Shrine feature, no design change → configure in the editor, don't write code. (b) Bespoke section, design or layout from the designer → build as `custom-*` files. (c) Custom design that needs commerce behaviour → the design is custom, the commerce calls Shrine's primitives.
2. **Read the target file in full.** Core Shrine file? Don't edit: copy with the `custom-` prefix or use an extension point.
3. **Find the existing pattern** (variant picker, quick-add, predictive search) and match it. Grep `sections/`, `blocks/`, `snippets/` first: Shrine likely already solves it.
4. **Ask before guessing** on schema design, block nesting and cross-market behaviour. A question is cheaper than a refactor.
5. **Extension-point ladder**, in order, before creating files: editor settings → app embeds and app blocks → metafields and metaobjects → new `custom-*` sections/blocks → snippets rendered from custom sections → last resort: `custom-` prefixed copy of a core file.

## Definition of Done (Claude's part, run before presenting work)

- [ ] `shopify theme check` passes; MCP `validate_theme` passes (plus `validate_graphql_codeblocks` / `validate_component_codeblocks` where relevant).
- [ ] No Shrine core file edited, or: bracketed hook plus `docs/changes.md` entry.
- [ ] All new files `custom-` prefixed; custom sections have a preset; `@app` accepted or a reason stated.
- [ ] Every new `t:` key present in `en.default.json` **and** `nl.json` (plus both schema locales).
- [ ] Images: `image_url` / `image_tag`, dimensions set, correct eager/lazy split, `sizes` reasoned from mobile.
- [ ] HTML size proxy on the largest affected template via the dev server: `curl -s http://127.0.0.1:9292/<path> | wc -c` stays under 500000.
- [ ] `docs/sections.md` / `docs/changes.md` updated where applicable.
- [ ] When browser tooling is available: screenshot review at 390×844 first, then desktop; accessibility-tree spot check on new components. Otherwise flag as open.

Human pre-publish checks live in `docs/release-checklist.md`. Those are human-only; Claude never claims them.

## Tooling & escalation

- Liquid, schemas, sections/blocks/snippets → `shopify-plugin:shopify-liquid` skill (authoritative for schema and section/block rules).
- Admin/Storefront GraphQL, Functions, extensions → the matching `shopify-plugin:*` skill over web search.
- Shrine specifics → shrine.io docs and changelog. If unreachable, read the actual source file being extended. Never guess at Shrine internals.
- Shrine theme update → follow the `shrine-update` skill, never improvise the procedure.
