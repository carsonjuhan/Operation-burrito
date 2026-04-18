# Operation Burrito — Design Document

## Overview

Operation Burrito is a personal baby-preparation management app for tracking purchases, hospital bag packing, prenatal appointments, contacts, classes, learning materials, birth plan, notes, and labour contractions. It is built as a static web app hosted on GitHub Pages.

---

## Architecture

```
Browser (client only)
  └── Next.js 14 App Router (static export)
        ├── localStorage          ← primary data store
        ├── sessionStorage        ← auth state (per tab)
        └── GitHub Gist API       ← cloud sync (optional)
```

### Key constraints
- **No backend / no server** — `output: "export"` in next.config.js produces plain HTML/JS/CSS
- **No SSR** — all pages render client-side; every page is a "use client" component
- **No external auth** — password is baked into the JS bundle at build time via `NEXT_PUBLIC_APP_PASSWORD`
- **Must work offline** — all core features require only localStorage
- **GitHub Gist is optional** — the app fully functions without cloud sync configured

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 with custom `sage` / `blush` palette |
| Icons | lucide-react |
| State | React Context + custom `useStore` hook |
| Persistence | localStorage (key: `operation-burrito-store`) |
| Cloud sync | GitHub Gist API via Personal Access Token |
| OCR | Tesseract.js (dynamically imported, lazy-loaded) |
| PDF text | pdfjs-dist (dynamically imported, CDN worker) |
| CI/CD | GitHub Actions → GitHub Pages |
| Auth | `NEXT_PUBLIC_APP_PASSWORD` env var baked at build time |

---

## Data Layer

### localStorage Schema
All data stored under one key as a single JSON object (`AppStore`):

```
operation-burrito-store → AppStore {
  items[]          BabyItem
  classes[]        BabyClass
  materials[]      Material
  birthPlan        BirthPlan (nested structured object)
  notes[]          Note
  hospitalBag[]    BagItem
  appointments[]   Appointment
  contacts[]       Contact
  contractions[]   Contraction
  registryUrl?     string
}
```

### Data Flow

```
User action
  → React component calls store method (e.g. addItem)
  → useStore hook updates state
  → localStorage.setItem (synchronous, immediate)
  → triggerAutoSync() schedules debounced Gist push (5 seconds)
  → If PAT + GistId configured: pushToGist() fires after delay
```

### GitHub Gist Sync
- Stored in separate localStorage keys: `ob-github-pat`, `ob-gist-id`, `ob-last-sync`
- Gist filename: `operation-burrito.json`
- Creates new private secret Gist on first push
- Updates same Gist on subsequent pushes
- Pull overwrites entire local store

---

## Import Pipeline

All import features follow the same pattern:

```
File upload / URL fetch
  → Parser library (src/lib/)
  → Review modal (src/components/*ImportModal.tsx)
  → User confirms selection
  → Bulk store CRUD calls (addItem, addAppointment, etc.)
  → localStorage updated + Gist auto-sync triggered
```

### Import Sources
| Source | Parser | Destination |
|--------|--------|-------------|
| Receipt image (JPG/PNG/HEIC/WEBP) | Tesseract.js OCR → receiptParser.ts | Baby Items or Hospital Bag |
| Receipt PDF | pdfjs-dist → receiptParser.ts | Baby Items or Hospital Bag |
| Calendar (.ics) | importParsers.ts `parseIcs()` | Appointments |
| vCard (.vcf) | importParsers.ts `parseVCard()` | Contacts |
| Email (.eml) | importParsers.ts `parseEml()` | Contacts or Appointments |
| Spreadsheet CSV | csvImporter.ts | Baby Items |
| Google Sheets URL | csvImporter.ts (URL → CSV fetch) | Baby Items |

---

## Authentication

- Single shared password for the household
- Password set via GitHub Actions secret `APP_PASSWORD` → baked into JS bundle as `NEXT_PUBLIC_APP_PASSWORD`
- Default password: `burrito` (if secret not set)
- Auth state in sessionStorage → survives page refresh, cleared when tab closes
- **Security note**: client-side only — not suitable for sensitive data, appropriate for personal family use

---

## Print / PDF Strategy

Birth Plan page uses a DOM-always-rendered approach:
- All 4 tab panels are always in the DOM (not conditionally rendered)
- Inactive tabs have `hidden` CSS class on screen
- `@media print` overrides: hides sidebar, nav, buttons; reveals all `.birth-plan-panel` divs
- User selects "Save as PDF" → browser print dialog → Save as PDF

---

## Color System (Tailwind)

Custom palette in `tailwind.config.ts`:

```
sage:  { 50: #f4f7f4, 100: #e6ede6, ..., 600: #4a7c59, 700: #3d6649 }
blush: { 50: #fdf4f4, 100: #fbe8e8, ..., 600: #c7545a, 700: #a8464b }
```

Primary actions: `bg-sage-600 hover:bg-sage-700` (green)
Destructive: `bg-rose-500` (red)
Secondary: `bg-white border border-stone-200`

---

## Routing

All routes are statically exported. In production, `basePath: /Operation-burrito` and `assetPrefix: /Operation-burrito/` are applied so links work under the GitHub Pages subdirectory.

```
/                  Dashboard
/items             Baby Items shopping list
/hospital-bag      Hospital bag checklist
/appointments      Prenatal appointments
/contacts          Key contacts
/classes           Prenatal classes
/materials         Learning materials / resources
/birth-plan        Birth plan (4-tab structured form)
/notes             General notes
/timer             Contraction timer
/search            Global search
/settings          GitHub Gist sync + registry URL
/budget            Purchase analytics (planned)
```

---

## Deployment

```yaml
Trigger: push to main branch
Steps:
  1. actions/checkout@v4
  2. actions/setup-node@v4 (Node 20)
  3. actions/configure-pages@v4
  4. npm ci
  5. npm run build (NODE_ENV=production, NEXT_PUBLIC_APP_PASSWORD from secret)
  6. actions/upload-pages-artifact@v3 (path: ./out)
  7. actions/deploy-pages@v4
```

Live URL: `https://carsonjuhan.github.io/Operation-burrito/`
