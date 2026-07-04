# Architecture — Operation Burrito

## Deployment Model

Static export (`output: "export"`) deployed to **S3 + CloudFront** at **baby.juhan.me** via `./deploy.sh`.

- `deploy.sh` builds the static export to `./out`, stamps a fresh `CACHE_VERSION` into `out/sw.js` (so browsers purge stale service-worker caches on each deploy), syncs `./out` to S3, and invalidates the CloudFront distribution
- No server-side rendering or API routes
- All pages must be client components (`"use client"`)
- Images unoptimized (required for static export)

## Application Structure

```
RootLayout (src/app/layout.tsx)
└── AuthGate (src/components/AuthGate.tsx)
    └── StoreProvider (src/contexts/StoreContext.tsx)
        ├── Sidebar (src/components/Sidebar.tsx) — fixed left, 256px
        └── <main> — page content (flex-1, offset on desktop)
```

## State Management

### Store Context
- `StoreContext` provides the global `AppStore` to all pages
- Backed by **localStorage** — reads on mount, writes on every mutation
- Single source of truth: `src/types/index.ts` defines the `AppStore` interface

### Data Flow
```
User Action → Page Component → StoreContext update → localStorage persist
                                                   → UI re-render
```

### GitHub Gist Sync (Optional)
```
Push: StoreContext → JSON.stringify → GitHub Gist API (PATCH/POST)
Pull: GitHub Gist API (GET) → JSON.parse → StoreContext replace → localStorage
```
- Configured via GitHub PAT stored in localStorage
- Gist ID tracked in localStorage
- Manual push/pull (not real-time)

## Utility Modules

| Module | Purpose |
|--------|---------|
| `gistSync.ts` | GitHub Gist CRUD, PAT management, push/pull |
| `csvImporter.ts` | Parse CSV files and Google Sheets data |
| `importParsers.ts` | Parse various file formats for import |
| `receiptParser.ts` | OCR (tesseract.js) and PDF (pdfjs-dist) receipt parsing |
| `inventoryMatching.ts` | Match owned items against checklist |
| `checklistData.ts` | Pre-built checklist item metadata |

## Routing

Next.js App Router with file-based routing. Each feature is a directory under `src/app/` with a `page.tsx`.

| Route | Feature |
|-------|---------|
| `/` | Dashboard |
| `/appointments` | Appointments |
| `/birth-plan` | Birth Plan |
| `/budget` | Budget Analytics |
| `/classes` | Classes |
| `/contacts` | Contacts |
| `/growth` | Growth Tracker (weight/length/head) |
| `/guides` | Feeding & Sleeping Guides |
| `/hospital-bag` | Hospital Bag |
| `/items` | Baby Items & Checklist |
| `/materials` | Materials |
| `/milestones` | Development Milestones |
| `/newborn` | Newborn Tracker (feed/sleep/diaper/med log) |
| `/notes` | Notes |
| `/postbirth` | Postpartum Checklist |
| `/recipes` | Postpartum Recipes |
| `/search` | Global Search |
| `/settings` | Settings |
| `/sleep-training` | Sleep Training Log |
| `/soothe` | Soothe Techniques |
| `/symptoms` | Symptom Checker |
| `/timer` | Contraction Timer |

## Styling

- Tailwind CSS with custom `sage-*` and `blush-*` color palettes
- Custom `@layer components` classes: `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.select`, `.textarea`, `.badge`
- Responsive: mobile-first, `md:` breakpoint for desktop sidebar
- Neutral colors: `stone-*` palette
