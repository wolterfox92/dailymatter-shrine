# Release checklist (human, before publish)

Claude runs its own Definition of Done (see `CLAUDE.md`) before presenting work. The checks below are human-only; Claude never claims them.

- [ ] Lighthouse on affected templates, live vs branch, mobile emulation: more than 2 perf points down or any CWV regression blocks.
- [ ] DevTools Network → Doc: uncompressed size < 500 KB on key templates.
- [ ] Tame the Bots fetch & render with "Cap text to 2 MB" and Googlebot Mobile UA: full content visible after the cap.
- [ ] Mueller test with a sentence from the top **and** the bottom (`site:domain "exact quote"`); top found + bottom missing = truncation.
- [ ] Response-vs-rendered HTML diff (AI crawlers often skip JS).
- [ ] Screaming Frog crawl, sort by size descending, review URLs > 1 MB.
- [ ] Rich Results Test on the largest page: schema parses without truncation errors.
- [ ] Publish-swap from the admin.
