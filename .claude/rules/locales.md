---
paths:
  - "locales/**"
---

# Locales & markets

- Primary storefront locale is **`nl`**; `en.default.*` is Shopify's canonical fallback.
- Every customer-facing string goes through settings or `| t`. Deliberate English brand copy (headers, taglines) is a content decision, entered as the setting or locale value, never hardcoded in Liquid.
- New `t:` keys land in `en.default.json` **and** `nl.json` in the same commit; schema keys in both `.schema.json` locales. Never ship a `t:` key without its `nl.json` value.
- `request.locale.iso_code` / `localization.language.iso_code` can return `nl`, `nl-NL`, `en-GB`: normalise case and match the language part first.
- Multi-market behaviour branches on `localization.country.iso_code` or market metafields, never on locale.
