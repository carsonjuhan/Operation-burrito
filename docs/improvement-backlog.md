# Improvement Backlog

From a full-repo review on 2026-07-02. Items are ordered roughly by leverage.
Completed items are kept for context — check them off or delete as they land.

## Done (2026-07-02, in working tree)

- [x] Fix 16 `tsc --noEmit` errors in test fixtures — fixtures now reuse `DEFAULT_BIRTH_PLAN` so they can't drift from the types again
- [x] Add merge tests for birth-date last-write-wins sync (5 cases in `storeMerge.test.ts`)
- [x] Delete stray `@` file; move `inject-notes.js` → `scripts/` (gitignored, contains personal notes)
- [x] Fix stale `docs/architecture.md` (deployment is S3 + CloudFront via `deploy.sh`, not GitHub Pages; route table expanded to all 22 routes)
- [x] Fix lint warnings: `exhaustive-deps` in `items/page.tsx` (real fix) and `newborn/page.tsx` (justified disable); migrate Google Fonts `<link>` → `next/font/google`
- [x] Delete unused `data/baby_checklist_metadata.json` (only v2 is imported)
- [x] Add CI: `.github/workflows/ci.yml` runs `tsc --noEmit`, lint, and tests on push/PR

## Open — needs a decision

- [ ] **Delete or disable `.github/workflows/deploy.yml`** — it still deploys to GitHub Pages on push to main, but real deploys go through `deploy.sh` to S3/CloudFront (baby.juhan.me). As-is it publishes a second, stale copy of the app.
- [ ] **Visual check of the font migration** — fonts are now self-hosted via `next/font` instead of the Google Fonts CDN; eyeball the app in `npm run dev` before deploying.

## Open — architecture / robustness (each worth its own session)

- [ ] **Consolidate duplicated merge logic.** `useStore.ts` (~940 lines) re-implements per-field merge rules that also live in `storeMerge.ts` — e.g. the birth-date newest-wins rule exists in both places. Extract the newborn-mirror reconciliation into `storeMerge.ts` (or a shared helper) so each field's rule exists exactly once. Highest-leverage refactor: every new synced field currently risks the two copies drifting.
- [ ] **Same-device multi-tab clobbering.** Per-device gist files prevent cross-device races, but two tabs on one device share a device file and can overwrite each other. Add a `storage` event listener to keep tabs coherent, or elect a single writing tab.
- [ ] **localStorage capacity ceiling.** Photos (`PhotoAttachment`) + the full store share the ~5MB origin cap; `storageMonitor.ts` already warns. Migrate photos (or the whole store) to IndexedDB to remove the ceiling and keep sync payloads small.
- [ ] **Split oversized pages.** `newborn/page.tsx` (~1,500 lines) and the dashboard `page.tsx` (~650 lines) — extract sub-panels (birth-date editor, hero timers, event log) into components so sync-adjacent changes are reviewable.

## Open — security (conscious tradeoffs, revisit deliberately)

- [ ] **PAT in plaintext localStorage + client-side-only AuthGate** (default password `"burrito"`). Acceptable for a personal two-user app, but ensure the PAT is a fine-grained token scoped to gists only — XSS anywhere in the app equals token theft.
- [ ] **`public/pdf.worker.min.mjs` is 1.2MB** — confirm it's only fetched on the receipt-import path, not eagerly.
