---
name: shrine-update
description: Safe update workflow for Shrine Theme Pro. Use when updating Shrine to a new version, preparing or auditing a theme update, reviewing an update diff, or re-applying tracked core edits after an update.
---

# Shrine Theme Pro update workflow

Shrine updates **do not respect edits**: the update mechanism can overwrite files wholesale. Before starting, audit `docs/changes.md` (every tracked core edit that must be re-applied) and `docs/sections.md` (every Shrine integration point that must be re-verified).

## Procedure

1. `shopify theme pull --live` into a fresh branch `chore/shrine-vX.Y.Z` → commit `chore: snapshot before shrine update vX.Y.Z`.
2. Duplicate the live theme in the admin as `Pre-update backup YYYY-MM-DD` (the rollback).
3. Apply the update on a separate duplicate (the test copy). Never on live, never on the backup.
4. Pull the updated theme into a new branch, diff against the snapshot, review every file Shrine changed.
5. Re-apply tracked edits from `docs/changes.md`, one commit each, changelog entry referenced.
6. Test critical flows **mobile first** (390×844), then desktop: homepage, PDP, cart drawer, checkout button, megamenu, bundles, search.
7. Re-verify every documented Shrine integration point in `docs/sections.md` (events, data attributes): internals can change without notice.
8. Lighthouse the test theme vs current live (mobile emulation). More than 2 perf points down or any CWV regression blocks the swap.
9. After human sign-off (see `docs/release-checklist.md`): publish-swap from the admin. Never from CLI.
10. Update the Shrine version number in `CLAUDE.md` (Versions section) and log the update in `docs/changes.md`.
