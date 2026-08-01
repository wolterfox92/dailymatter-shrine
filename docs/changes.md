# Tracked edits to Shrine core files

Shrine updates overwrite files wholesale. Every unavoidable edit to a core file is
logged here so it can be audited and re-applied after an update.

Audit this file **before every Shrine update**, and re-apply each entry as its own
commit afterwards.

---

## custom-typography

**Date:** 2026-08-01
**File:** `layout/theme.liquid`
**Type:** Bracketed `CUSTOM-START` / `CUSTOM-END` hook (the only sanctioned core edit)

**Reason:** Running copy on the product page rendered at three different sizes
(15px / 14px / 13px). The 14px case is `.delivery-time__text`, styled inside Shrine's
`assets/base.css`, and the block exposes no font-size setting — so there is no
editor, metafield or block-level extension point for it. A scoped override in a
custom stylesheet is the lowest-impact fix; it needs a `<link>` that loads after
`base.css`, which only `theme.liquid` can provide.

**Diff:** inserted directly after the existing `base.css` / `rtl.css` block
(around line 434):

```liquid
{%- comment -%} CUSTOM-START: typography normalisation — see docs/changes.md#custom-typography {%- endcomment -%}
{{ 'custom-typography.css' | asset_url | stylesheet_tag }}
{%- comment -%} CUSTOM-END: typography normalisation {%- endcomment -%}
```

**Depends on:** `assets/custom-typography.css` (additive, `custom-` prefixed, not
at risk from updates).

**Re-apply check after an update:** confirm `.delivery-time__text` still exists in
`base.css` and still ships at a size other than `1.5rem`. If Shrine changes the
class name, update the override; if Shrine adopts `1.5rem`, drop the rule (and this
hook, if nothing else uses the stylesheet).
