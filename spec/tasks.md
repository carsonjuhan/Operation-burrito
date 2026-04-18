# Operation Burrito — Task List

Status: ✓ Done · ◐ In Progress · ○ Pending

---

## Phase 1: Project Scaffold ✓

- ✓ Initialize Next.js 14 app with TypeScript and Tailwind CSS
- ✓ Configure `output: "export"` for static site generation
- ✓ Set up `basePath` / `assetPrefix` for GitHub Pages subdirectory
- ✓ Add custom Tailwind palette (sage, blush)
- ✓ Set up GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)
- ✓ Configure GitHub Pages with GitHub Actions source
- ✓ Add `actions/configure-pages@v4` step to workflow
- ✓ Add `APP_PASSWORD` secret injection in build step
- ✓ Fix Google Fonts network fetch failure (removed `next/font/google` import)

---

## Phase 2: Core Data Model ✓

- ✓ Define all types in `src/types/index.ts`:
  - `BabyItem` (id, name, category, priority, purchased, notes, link, estimatedCost, actualCost, createdAt)
  - `BabyClass` (id, name, type, provider, date, completed, notes, location, cost, createdAt)
  - `Material` (id, title, type, topic, url, filePath, notes, savedAt, createdAt)
  - `BirthPlan` (personalInfo, labour, afterBirth, interventions, notes, updatedAt)
  - `Note` (id, title, content, category, pinned, createdAt, updatedAt)
  - `BagItem` (id, name, category, packed, notes, quantity)
  - `Appointment` (id, title, type, date, time, provider, location, notes, completed, createdAt)
  - `Contact` (id, name, role, phone, email, notes, createdAt)
  - `Contraction` (id, startTime, endTime, duration, interval)
  - `AppStore` (all arrays + birthPlan)
- ✓ Build `useStore` hook (`src/hooks/useStore.ts`):
  - localStorage persistence with JSON serialization
  - CRUD operations for all 9 entity types
  - `loadFromExternal()` for Gist pull
  - `triggerAutoSync()` debounced 5-second Gist push
  - Default values: 32 pre-populated hospital bag items, birth plan with BC Women's Hospital structure
- ✓ Build `StoreContext` (`src/contexts/StoreContext.tsx`) — React context wrapping useStore

---

## Phase 3: Components ✓

- ✓ `AuthGate.tsx` — password gate with sessionStorage, shake animation
- ✓ `Sidebar.tsx` — 11 nav items, Settings, mobile hamburger + slide-in overlay, Gist sync status
- ✓ `Modal.tsx` — reusable modal dialog wrapper
- ✓ `EmptyState.tsx` — empty state with icon, title, description, action button
- ✓ Root layout (`src/app/layout.tsx`) — AuthGate → StoreProvider → content with md:ml-64

---

## Phase 4: Pages ✓

- ✓ Dashboard (`/`) — countdown banner, 4 stat cards, budget strip, must-have items, appointments widget, pinned notes, materials count
- ✓ Baby Items (`/items`) — list with filters, receipt scan import
- ✓ Hospital Bag (`/hospital-bag`) — checklist, progress bar, receipt scan import
- ✓ Appointments (`/appointments`) — upcoming/past, ICS import
- ✓ Contacts (`/contacts`) — grid cards, vCard/email import
- ✓ Classes (`/classes`) — upcoming/completed, cost tracking
- ✓ Materials (`/materials`) — filterable resource library
- ✓ Birth Plan (`/birth-plan`) — 4-tab form, auto-save, PDF print
- ✓ Notes (`/notes`) — pinned + all notes, category filter
- ✓ Contraction Timer (`/timer`) — start/stop, 5-1-1 rule, recent log
- ✓ Global Search (`/search`) — cross-section instant search with highlighting
- ✓ Settings (`/settings`) — GitHub Gist sync UI (PAT verify, push/pull, Gist ID)

---

## Phase 5: Import Features ✓

- ✓ `src/lib/receiptParser.ts` — Tesseract.js OCR, pdfjs text extraction, item/price parsing
- ✓ `src/lib/importParsers.ts` — ICS, vCard, EML parsers, date/time extraction
- ✓ `src/components/ReceiptImportModal.tsx` — 2-step: upload → review → import to Items or Bag
- ✓ `src/components/IcsImportModal.tsx` — upload → review events → bulk import to Appointments
- ✓ `src/components/VcardImportModal.tsx` — upload → review contacts/appointment → import

---

## Phase 6: Spec Documentation ◐

- ◐ `spec/design.md` — architecture, technology, data flow, color system, routing, deploy
- ◐ `spec/requirements.md` — all functional and non-functional requirements with status
- ◐ `spec/tasks.md` — this file

---

## Phase 7: Amazon Registry Link ○

- ○ Add `registryUrl?: string` to `AppStore` in `src/types/index.ts`
- ○ Add `updateRegistryUrl(url: string)` to `src/hooks/useStore.ts`
- ○ Settings page: "Amazon Baby Registry" URL input section with save button
- ○ Items page header: "View Registry →" external link button (shown if URL set)
- ○ Dashboard: registry link widget in lower section

---

## Phase 8: Google Sheets / CSV Import ○

- ○ `src/lib/csvImporter.ts`:
  - `parseCsv(text)` — RFC 4180 CSV parser (handles quoted fields, commas in values)
  - `autoMapColumns(headers)` — fuzzy match headers to app fields (name, category, cost, etc.)
  - `mapRowToItem(row, mapping)` — convert CSV row to BabyItem payload
  - `normalizeCategory(val)` — map raw category strings to ItemCategory enum
  - `normalizePriority(val)` — map "High/Medium/Low", "Must Have" etc. to ItemPriority
  - `normalizePurchased(val)` — map "Yes/No/Purchased/Needed/✓" to boolean
- ○ `src/components/CsvImportModal.tsx` — 4-step wizard:
  - Step 1: URL input (Google Sheets) or CSV file upload
  - Step 2: Column mapping (auto-detected, user-adjustable)
  - Step 3: Preview table (first 5 mapped rows)
  - Step 4: Confirm import count
- ○ Items page: "Import Spreadsheet" button + modal state
- ○ Test with user's Google Sheet (`1eBGqPAGBsxBgzlhjWLKS3RF7EAH4tMDBWuMSHaVyYNc`)

---

## Phase 9: Budget & Analytics Page ○

- ○ `src/components/BudgetChart.tsx`:
  - Props: `{ categories: { name, estimated, actual }[] }`
  - CSS-only horizontal bar chart (no external library)
  - Two-layer bar: sage (actual spent) + stone-200 (estimated remaining)
  - Shows dollar amounts and percentage filled
- ○ `src/app/budget/page.tsx` — 4 sections:
  - **Spending by Category** — BudgetChart per ItemCategory with estimated vs actual
  - **Missing Critical Items** — Must Have unpurchased items sorted by cost, with quick-purchase button
  - **Running Totals** — grand estimated, actual spent, remaining, spent this month
  - **Registry Reference** — link to Amazon registry for cross-reference
- ○ Sidebar: add "Budget" nav item between Items and Hospital Bag
- ○ Dashboard budget strip: make it a link to `/budget`

---

## Phase 10: Build & Deploy ○

- ○ `npm run build` — verify zero TypeScript errors, 16 static routes
- ○ Verify all new pages and modals render correctly
- ○ Commit all changes with descriptive message
- ○ `git push origin claude/baby-prep-management-app-eveOI:main` — trigger GitHub Actions
- ○ Verify deployment at `https://carsonjuhan.github.io/Operation-burrito/`
