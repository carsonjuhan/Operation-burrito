# Project Context — Operation Burrito

> LLM-optimized project context. Read this before making any code changes.

## Overview

**Operation Burrito** is a baby preparation management app for expecting parents. It tracks items to buy, manages budgets, organizes hospital bags, schedules appointments, stores contacts, and more — all client-side with optional GitHub Gist sync.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.5 |
| UI | React | ^18 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS | ^3.4.1 |
| Icons | lucide-react | ^0.400.0 |
| Class utils | clsx | ^2.1.1 |
| PDF parsing | pdfjs-dist | ^5.6.205 |
| OCR | tesseract.js | ^7.0.0 |
| Linting | ESLint + eslint-config-next | ^8 |

## Architecture

### Deployment Model
- **Static export** (`output: "export"`) deployed to **GitHub Pages**
- Production uses `basePath: "/Operation-burrito"` and matching `assetPrefix`
- **No server components with data fetching** — everything is client-side

### State Management
- Single `AppStore` interface in `src/types/index.ts` holds all persisted state
- `StoreProvider` (React Context) at `src/contexts/StoreContext.tsx` wraps the app
- All data persisted to **localStorage**
- Optional **GitHub Gist sync** via PAT for cross-device persistence (`src/lib/gistSync.ts`)

### Authentication
- `AuthGate` component wraps the app (in layout.tsx)

### Component Layout
- `RootLayout` → `AuthGate` → `StoreProvider` → `Sidebar` + `<main>` content
- Sidebar is fixed 256px (w-64) on desktop, slide-in drawer on mobile

## File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (AuthGate → StoreProvider → Sidebar)
│   ├── page.tsx            # Dashboard
│   ├── globals.css         # Tailwind + custom component classes
│   ├── appointments/       # Appointment scheduling
│   ├── birth-plan/         # Birth plan builder
│   ├── budget/             # Budget tracking & analytics
│   ├── classes/            # Prenatal/parenting classes
│   ├── contacts/           # Important contacts
│   ├── hospital-bag/       # Hospital bag checklist
│   ├── items/              # Baby items & shopping checklist
│   ├── materials/          # Educational materials/resources
│   ├── notes/              # General notes
│   ├── search/             # Global search
│   ├── settings/           # App settings & sync config
│   └── timer/              # Contraction timer
├── components/             # Shared components
│   ├── Sidebar.tsx         # Navigation sidebar
│   └── AuthGate.tsx        # Authentication wrapper
├── contexts/
│   └── StoreContext.tsx     # Global state provider
├── lib/                    # Utility modules
│   ├── gistSync.ts         # GitHub Gist CRUD & sync
│   ├── csvImporter.ts      # CSV/Sheets data import
│   ├── importParsers.ts    # File import parsers
│   ├── receiptParser.ts    # Receipt OCR/PDF parsing
│   ├── inventoryMatching.ts # Inventory matching logic
│   └── checklistData.ts    # Checklist metadata
└── types/
    └── index.ts            # All TypeScript interfaces (single barrel)
```

## Data Model (AppStore)

| Entity | Key Fields | Purpose |
|--------|-----------|---------|
| `BabyItem` | name, category, priority, timing, purchased, estimatedCost, actualCost | Shopping/item tracking |
| `ChecklistItem` | name, category, timing, source | Pre-built checklist metadata |
| `BabyClass` | name, type, provider, date, completed, cost | Prenatal/parenting classes |
| `Material` | title, type, topic, url | Educational resources |
| `BirthPlan` | personalInfo, labour, afterBirth, interventions | Detailed birth plan builder |
| `Note` | title, content, category, pinned | General notes |
| `BagItem` | name, category, packed, quantity | Hospital bag checklist |
| `Appointment` | title, type, date, time, provider, location | Appointment scheduling |
| `Contact` | name, role, phone, email | Important contacts |
| `Contraction` | startTime, endTime, duration, interval | Contraction timer |

### Categories & Enums
- **ItemCategory**: Nursery, Clothing, Feeding, Safety, Travel, Health & Hygiene, Toys & Gear, Postpartum, Other
- **ItemPriority**: Must Have, Nice to Have, Optional
- **ItemTiming**: Pregnancy, Hospital (Pre-birth), Newborn (0-3 months), 1-6 months, Special occasions, Other

## Critical Rules

1. **All pages must use `"use client"`** — static export means no server-side data fetching
2. **React Rules of Hooks** — `useMemo`/`useCallback` MUST appear before any early `return` statements (fixed in commit 7e72c84)
3. **Path alias** — use `@/*` which maps to `./src/*`
4. **No `next/image` optimization** — `images.unoptimized: true` for static export
5. **localStorage is the source of truth** — all CRUD goes through the store context
6. **GitHub Pages routing** — all links must work with the `/Operation-burrito` base path in production

## Styling Conventions

- **Custom color palettes**: `sage-*` (green tones, primary) and `blush-*` (pink/red tones, accent)
- **Primary UI color**: `sage-600` for active states, `sage-100` for active backgrounds
- **Neutral**: `stone-*` palette for text, borders, backgrounds
- **Custom component classes** (defined in globals.css `@layer components`): `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.select`, `.textarea`, `.badge`
- Responsive: mobile-first with `md:` breakpoint for desktop sidebar layout
