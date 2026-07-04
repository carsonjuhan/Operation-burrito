# Operation Burrito — Baby Prep & Newborn Tracking App

Personal PWA for pregnancy prep and newborn tracking (checklist, budget, hospital bag, birth plan, appointments, newborn feed/sleep/diaper logging). Deployed at baby.juhan.me.

## Commands

```bash
npm run dev            # Dev server
npm run build          # Static export to ./out
npm test               # Vitest (single run)
npm run lint           # ESLint (next lint)
npx tsc --noEmit       # Typecheck — NOT part of npm test; run it separately
./deploy.sh            # Build + stamp sw.js cache version + S3 sync + CloudFront invalidation
```

Run a single test file: `npx vitest run src/lib/__tests__/storeMerge.test.ts`

## Architecture constraints

- **Static export** (`output: "export"` in next.config.js): no SSR, no API routes, no server. Every page is a client component (`"use client"`). Images unoptimized.
- **Deployment is S3 + CloudFront** (baby.juhan.me) via `deploy.sh`, not GitHub Pages. `deploy.sh` rewrites `CACHE_VERSION` in `out/sw.js` per deploy so browsers purge stale caches — keep that constant's exact format in `public/sw.js`.
- **All state lives in localStorage.** `StoreContext` / `useStore` (src/hooks/useStore.ts) holds the global `AppStore` (src/types/index.ts). Newborn tracker data is a separate localStorage blob (src/lib/newbornTracker.ts) mirrored into `AppStore.newborn*` fields for sync.
- **Sync is via a private GitHub Gist** (src/lib/gistSync.ts). Each device pushes to its own `device-<id>.json` file; pull loads all device files and folds them with `mergeStores`. The PAT is stored in plaintext localStorage — a known tradeoff, don't "fix" without discussing.

## Sync/merge rules (src/lib/storeMerge.ts)

When adding a field to `AppStore`, you must decide its merge rule or it silently falls back to `...local` (remote edits never propagate):

- Lists of entities: `mergeById` (newest `updatedAt` wins per id) + tombstones (`deletedIds`) for deletes.
- Scalar fields (e.g. `newbornBabyBirthDate`, `newbornActiveNursing`): pair them with an `...UpdatedAt` timestamp and take the newer side; on a timestamp tie prefer the side that has a value.
- Boolean ID lists (checklist skipped/done): union.
- Also update `validateAppStore` (src/lib/syncValidation.ts) — pulls drop files that fail validation.

## Conventions & gotchas

- Parse `"YYYY-MM-DD"` dates as **local** time (`new Date(y, m-1, d)`), never `new Date(str)` — the UTC interpretation rolls dates back a day in Pacific time.
- i18n: all user-facing strings go through `useI18n`; en and fr locale files (src/locales/) must stay key-complete — tests enforce parity.
- Styling: Tailwind with custom `sage-*`/`blush-*` palettes and shared `@layer components` classes (`.card`, `.btn-primary`, `.input`, …) in globals.css — use those, don't restyle ad hoc.
- Static reference content (checklists, guides, recipes) lives in `data/*.json`, imported at build time.
- Tests live in `__tests__/` next to the code. Vitest does not typecheck; run `npx tsc --noEmit` before considering a change done.
- `docs/` describes architecture but parts are stale (it says GitHub Pages; deployment is actually S3/CloudFront).
