# Component Inventory — Operation Burrito

## Pages (`src/app/`)

| Page | File | Description |
|------|------|-------------|
| Dashboard | `page.tsx` | Overview with progress summaries across all features |
| Baby Items | `items/page.tsx` | CRUD for items with category/priority/timing filters, cost tracking, checklist matching |
| Budget | `budget/page.tsx` | Budget analytics — estimated vs. actual costs, category breakdowns |
| Hospital Bag | `hospital-bag/page.tsx` | Packing checklist with categories and packed status |
| Birth Plan | `birth-plan/page.tsx` | Multi-section form: personal info, labour, after birth, interventions |
| Appointments | `appointments/page.tsx` | Appointment scheduling with type, provider, location |
| Contacts | `contacts/page.tsx` | Contact directory with roles (doctor, midwife, doula, etc.) |
| Classes | `classes/page.tsx` | Prenatal/parenting class tracker with completion status |
| Materials | `materials/page.tsx` | Educational resource library (PDFs, videos, articles, books) |
| Notes | `notes/page.tsx` | Categorized notes with pinning |
| Timer | `timer/page.tsx` | Contraction timer with duration/interval calculations |
| Search | `search/page.tsx` | Global search across all data types |
| Settings | `settings/page.tsx` | GitHub sync config, data management |

## Shared Components (`src/components/`)

| Component | File | Description |
|-----------|------|-------------|
| Sidebar | `Sidebar.tsx` | Navigation sidebar — fixed on desktop, slide-in drawer on mobile. Shows all nav items + GitHub sync status |
| AuthGate | `AuthGate.tsx` | Authentication wrapper in layout |

## Contexts (`src/contexts/`)

| Context | File | Description |
|---------|------|-------------|
| StoreContext | `StoreContext.tsx` | Global state provider — wraps entire app, persists AppStore to localStorage |

## Lib Utilities (`src/lib/`)

| Module | File | Description |
|--------|------|-------------|
| Gist Sync | `gistSync.ts` | GitHub Gist API integration — PAT management, create/update/load gists, push/pull |
| CSV Importer | `csvImporter.ts` | Parse and import CSV files and Google Sheets data |
| Import Parsers | `importParsers.ts` | Parse various file formats (receipts, calendar, contacts, email) |
| Receipt Parser | `receiptParser.ts` | Client-side OCR (tesseract.js) and PDF parsing (pdfjs-dist) |
| Inventory Matching | `inventoryMatching.ts` | Match user's items against checklist recommendations |
| Checklist Data | `checklistData.ts` | Pre-built checklist item metadata and categories |

## Types (`src/types/index.ts`)

Single barrel file containing all TypeScript interfaces: `BabyItem`, `ChecklistItem`, `BabyClass`, `Material`, `BirthPlan` (with sub-interfaces), `Note`, `BagItem`, `Appointment`, `Contact`, `Contraction`, `AppStore`.
