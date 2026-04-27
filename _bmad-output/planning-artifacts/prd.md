# Product Requirements Document (PRD) — Operation Burrito

**Product Name:** Operation Burrito
**Version:** 0.1.0
**Last Updated:** 2026-04-21
**Status:** In Development

---

## 1. Introduction

Operation Burrito is a comprehensive baby preparation management application for expecting parents. It consolidates the many scattered tools, spreadsheets, and mental checklists that parents rely on into a single, privacy-first web application. The app runs entirely client-side with no accounts required, storing all data in the browser's localStorage with optional cross-device sync via GitHub Gist.

The product is deployed as a static Next.js export on GitHub Pages, requiring zero backend infrastructure and incurring zero hosting costs.

---

## 2. Goals and Objectives

### Primary Goals

1. **Unified preparation hub** — Replace the fragmented collection of spreadsheets, apps, and mental notes with one purpose-built tool that covers all baby preparation workflows.
2. **Zero-friction onboarding** — No account creation, no email verification, no setup wizard. Open the URL and start using it immediately.
3. **Privacy by default** — All data remains on the user's device. Sync is opt-in and user-controlled through their own GitHub account.
4. **Feature completeness** — Cover every major preparation domain: shopping, budgeting, medical planning, hospital readiness, education, and day-of-delivery tools.

### Success Metrics

| Metric | Target |
|--------|--------|
| Feature completeness | All major baby prep workflows covered in v0.1.0 |
| Data reliability | Zero data loss with localStorage + Gist backup |
| Initial load time | < 2 seconds on mobile devices |
| Mobile usability | Fully responsive, touch-friendly on all screen sizes |
| Offline capability | Full functionality without internet (except Gist sync) |

---

## 3. Target Users and Personas

### Persona 1: First-Time Expecting Parent

- **Profile:** Adult expecting their first child, unfamiliar with what items and preparations are needed.
- **Needs:** Curated checklists of recommended items, birth plan guidance, hospital bag packing list, budget visibility.
- **Pain points:** Overwhelmed by the volume of advice and product recommendations; no single source of truth.
- **How they use it:** Follows the built-in checklist, marks items as purchased, builds their birth plan section by section, tracks appointments over weeks/months.

### Persona 2: Experienced Parent Preparing for Another Child

- **Profile:** Parent who has done this before but needs to track what they already own versus what they need to buy again.
- **Needs:** Inventory matching against checklist, quick import from existing registry, budget tracking for incremental purchases.
- **Pain points:** Existing items scattered across storage; hard to remember what was kept versus donated.
- **How they use it:** Marks checklist items as "already have," imports Amazon registry data, focuses on the delta between owned and needed.

### Persona 3: Coordinating Partner

- **Profile:** Partner who wants to stay informed and help with preparation tasks without duplicating effort.
- **Needs:** Shared visibility into what has been purchased, upcoming appointments, and the birth plan.
- **Pain points:** Information siloed in the other partner's phone or notes app.
- **How they use it:** Syncs via GitHub Gist to access the same data on their own device; reviews birth plan, checks budget status, marks items as purchased.

### Secondary Users

- **Baby shower organizers** who need visibility into registry items and what has already been purchased.
- **Support people** (doulas, family members) who need access to birth plan details or emergency contact information.

---

## 4. Functional Requirements

### 4.1 Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-01 | Display due date countdown banner with weeks+days remaining, color-coded by urgency (green > 6 weeks, amber 2-6 weeks, red < 2 weeks) | Must Have |
| DASH-02 | Show four stat cards: Items Purchased (with progress bar), Bag Packed, Birth Plan completion, Classes completed | Must Have |
| DASH-03 | Display budget summary strip: Estimated Total, Spent So Far, Still Needed | Must Have |
| DASH-04 | List up to 6 unpurchased "Must Have" items | Must Have |
| DASH-05 | List up to 3 upcoming appointments sorted by date | Must Have |
| DASH-06 | Display pinned notes (up to 3) | Must Have |
| DASH-07 | Show total saved materials count | Nice to Have |
| DASH-08 | Display Amazon registry quick-link if URL is configured | Nice to Have |

### 4.2 Baby Items and Checklist

| ID | Requirement | Priority |
|----|-------------|----------|
| ITEM-01 | Display a pre-built checklist of recommended baby items sourced from curated metadata (`ChecklistItem[]`) | Must Have |
| ITEM-02 | Support custom item creation with fields: name (required), category (`ItemCategory`), priority (`ItemPriority`), estimated cost, link, notes, timing (`ItemTiming`), purchased status | Must Have |
| ITEM-03 | Provide nine item categories: Nursery, Clothing, Feeding, Safety, Travel, Health & Hygiene, Toys & Gear, Postpartum, Other | Must Have |
| ITEM-04 | Provide three priority levels: Must Have, Nice to Have, Optional | Must Have |
| ITEM-05 | Provide six timing groups: Pregnancy, Hospital (Pre-birth), Newborn (0-3 months), 1-6 months, Special occasions, Other | Must Have |
| ITEM-06 | Group items by category with collapsible sections showing per-category progress bars | Must Have |
| ITEM-07 | Support four status types for checklist items: need, in-list, purchased, already-have | Must Have |
| ITEM-08 | Allow quick actions from checklist: "Add to List," "Mark Bought," "Already Have" | Must Have |
| ITEM-09 | Filter by timing, status (All / Need to Buy / In My List / Have It), category, and priority | Must Have |
| ITEM-10 | Toggle between "All Items" view (full checklist + custom) and "My Tracked Items" view | Must Have |
| ITEM-11 | Auto-import unique inventory items from Amazon registry data that do not match checklist items | Must Have |
| ITEM-12 | Match Amazon purchased items against checklist items using fuzzy name matching | Must Have |
| ITEM-13 | Support inline edit and delete for tracked items | Must Have |
| ITEM-14 | Open CSV/Sheets import modal for bulk item import | Must Have |
| ITEM-15 | Open receipt scanner modal for OCR-based item capture | Nice to Have |

#### Data Model: `BabyItem`

```typescript
interface BabyItem {
  id: string;
  name: string;
  category: ItemCategory;
  priority: ItemPriority;
  purchased: boolean;
  notes: string;
  link?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  timing?: ItemTiming;
}
```

#### Data Model: `ChecklistItem`

```typescript
interface ChecklistItem {
  id: string;
  name: string;
  nameOriginal?: string;
  category: ItemCategory;
  categoryOriginal?: string;
  categoryEn?: string;
  timing: ItemTiming;
  source?: string;
  list?: string;
}
```

### 4.3 Budget and Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| BUDG-01 | Display four summary cards: Estimated Total, Actual Spent, Still Needed, This Month's spending | Must Have |
| BUDG-02 | Show spending breakdown by category with visual chart (estimated vs. actual per category) | Must Have |
| BUDG-03 | List all unpurchased "Must Have" items sorted by estimated cost descending with one-click "Mark purchased" | Must Have |
| BUDG-04 | Calculate "This Month" spending based on `createdAt` timestamps of purchased items | Must Have |
| BUDG-05 | Display Amazon registry reference link with cross-reference guidance | Nice to Have |
| BUDG-06 | Derive actual cost from `actualCost` field when present, falling back to `estimatedCost` | Must Have |

### 4.4 Hospital Bag

| ID | Requirement | Priority |
|----|-------------|----------|
| BAG-01 | Display pre-populated hospital bag checklist with default items across nine categories | Must Have |
| BAG-02 | Support nine bag categories: Clothing (Mom), Clothing (Baby), Documents, Toiletries, Comfort & Labour, Feeding, Electronics, Snacks, Other | Must Have |
| BAG-03 | Toggle packed/unpacked status per item | Must Have |
| BAG-04 | Support adding custom bag items with name, category, quantity, and notes | Must Have |
| BAG-05 | Track quantity per item (optional, defaults to 1) | Must Have |
| BAG-06 | Display packing progress percentage | Must Have |

#### Data Model: `BagItem`

```typescript
interface BagItem {
  id: string;
  name: string;
  category: BagCategory;
  packed: boolean;
  notes: string;
  quantity?: number;
}
```

### 4.5 Birth Plan

| ID | Requirement | Priority |
|----|-------------|----------|
| BP-01 | Capture personal information: legal name, preferred name, due date, current medications, allergies | Must Have |
| BP-02 | Capture labour preferences: birth partner, doula, support people, labour goal, atmosphere notes | Must Have |
| BP-03 | Capture comfort measures with boolean toggles: walking, labour ball, tub, shower, heat, ice, massage, TENS, plus free-text "other" | Must Have |
| BP-04 | Capture pushing preferences: variety of positions, help with pushing, self-directed, other | Must Have |
| BP-05 | Capture pain medication preferences: only if asked, offer if not coping, offer ASAP, nitrous, morphine/fentanyl, epidural, other | Must Have |
| BP-06 | Capture photography notes, personal touches, cord blood donation preferences | Must Have |
| BP-07 | Capture after-birth preferences: skin-to-skin, cord cutting person, feeding plan (breastfeed/formula/other), newborn treatments (antibiotic eye ointment, vitamin K injection), placenta preferences, circumcision preferences, visitor preference | Must Have |
| BP-08 | Capture intervention preferences: decision inclusion, continuous monitoring, prolonged labour approach, assisted birth preference, caesarian wishes, special care for baby | Must Have |
| BP-09 | Auto-save on field change with `updatedAt` timestamp | Must Have |
| BP-10 | Track birth plan completion as a ratio of filled fields out of a defined total (20 key fields) on dashboard | Must Have |

#### Data Model: `BirthPlan`

```typescript
interface BirthPlan {
  updatedAt: string;
  personalInfo: BirthPlanPersonalInfo;
  labour: BirthPlanLabour;
  afterBirth: BirthPlanAfterBirth;
  interventions: BirthPlanInterventions;
  notes: string;
}
```

### 4.6 Appointments

| ID | Requirement | Priority |
|----|-------------|----------|
| APPT-01 | Create appointments with: title, type (`AppointmentType`), date, time, provider, location, notes | Must Have |
| APPT-02 | Support seven appointment types: OB / Midwife, Ultrasound, Blood Work, Hospital Tour, Dentist, Specialist, Other | Must Have |
| APPT-03 | Mark appointments as completed | Must Have |
| APPT-04 | Sort upcoming appointments by date | Must Have |
| APPT-05 | Display next 3 upcoming appointments on dashboard | Must Have |

#### Data Model: `Appointment`

```typescript
interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  date: string;
  time: string;
  provider: string;
  location: string;
  notes: string;
  completed: boolean;
  createdAt: string;
}
```

### 4.7 Contacts

| ID | Requirement | Priority |
|----|-------------|----------|
| CONT-01 | Store contacts with: name, role (`ContactRole`), phone, email, notes | Must Have |
| CONT-02 | Support eight contact roles: OB / Doctor, Midwife, Doula, Hospital, Pediatrician, Partner, Family, Other | Must Have |
| CONT-03 | Support CRUD operations (create, read, update, delete) for contacts | Must Have |
| CONT-04 | Include contacts in global search results | Must Have |

#### Data Model: `Contact`

```typescript
interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}
```

### 4.8 Classes

| ID | Requirement | Priority |
|----|-------------|----------|
| CLS-01 | Track prenatal and parenting classes with: name, type (`ClassType`), provider, date, location, cost, notes | Must Have |
| CLS-02 | Support seven class types: Childbirth, Breastfeeding, Newborn Care, CPR / First Aid, Parenting, Prenatal Fitness, Other | Must Have |
| CLS-03 | Mark classes as completed | Must Have |
| CLS-04 | Display completed/total class count on dashboard | Must Have |

#### Data Model: `BabyClass`

```typescript
interface BabyClass {
  id: string;
  name: string;
  type: ClassType;
  provider: string;
  date: string;
  completed: boolean;
  notes: string;
  location?: string;
  cost?: number;
  createdAt: string;
}
```

### 4.9 Materials

| ID | Requirement | Priority |
|----|-------------|----------|
| MAT-01 | Save educational resources with: title, type (`MaterialType`), topic, URL, file path, notes | Must Have |
| MAT-02 | Support six material types: PDF / Document, Video, Article, Book, App, Other | Must Have |
| MAT-03 | Support CRUD operations for materials | Must Have |
| MAT-04 | Display total materials count on dashboard | Must Have |

#### Data Model: `Material`

```typescript
interface Material {
  id: string;
  title: string;
  type: MaterialType;
  topic: string;
  url?: string;
  filePath?: string;
  notes: string;
  savedAt: string;
  createdAt: string;
}
```

### 4.10 Notes

| ID | Requirement | Priority |
|----|-------------|----------|
| NOTE-01 | Create notes with: title, content, category (`NoteCategory`), pinned status | Must Have |
| NOTE-02 | Support six note categories: Appointment, Milestone, Question for Doctor, Hospital Bag, Postpartum Plan, General | Must Have |
| NOTE-03 | Pin/unpin notes; pinned notes appear on dashboard | Must Have |
| NOTE-04 | Track `createdAt` and `updatedAt` timestamps | Must Have |
| NOTE-05 | Support CRUD operations for notes | Must Have |

#### Data Model: `Note`

```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.11 Contraction Timer

| ID | Requirement | Priority |
|----|-------------|----------|
| TMR-01 | Start/stop a timer that records contraction start time, end time, and duration in seconds | Must Have |
| TMR-02 | Automatically calculate interval (seconds since previous contraction started) | Must Have |
| TMR-03 | Display a running clock during active contraction | Must Have |
| TMR-04 | Show contraction history in reverse chronological order with duration and interval | Must Have |
| TMR-05 | Implement the 5-1-1 rule alert: contractions 5 minutes or less apart, 1 minute or longer each, for 1 hour or more triggers a visual warning to go to the hospital | Must Have |
| TMR-06 | Allow deletion of individual contraction records | Nice to Have |

#### Data Model: `Contraction`

```typescript
interface Contraction {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;   // seconds
  interval: number;   // seconds since last contraction started
}
```

### 4.12 Global Search

| ID | Requirement | Priority |
|----|-------------|----------|
| SRCH-01 | Search across all data types: items, notes, materials, classes, appointments, contacts, hospital bag items | Must Have |
| SRCH-02 | Display results grouped by section with section-specific icons | Must Have |
| SRCH-03 | Link each result to its relevant page | Must Have |
| SRCH-04 | Match against name/title fields and secondary fields (notes, content, provider, etc.) | Must Have |
| SRCH-05 | Provide real-time filtering as user types | Must Have |

### 4.13 Settings

| ID | Requirement | Priority |
|----|-------------|----------|
| SET-01 | Configure GitHub Gist sync: enter Personal Access Token, verify connection, display connected username | Must Have |
| SET-02 | Push current app state to GitHub Gist (creates new Gist on first push, updates existing on subsequent) | Must Have |
| SET-03 | Pull app state from GitHub Gist, replacing all local data (with confirmation dialog) | Must Have |
| SET-04 | Display Gist ID with link to view on GitHub | Must Have |
| SET-05 | Support "new device" flow: enter existing Gist ID manually, then pull | Must Have |
| SET-06 | Disconnect from GitHub (clear PAT, Gist ID, sync status) with confirmation | Must Have |
| SET-07 | Save Amazon baby registry URL for quick access across the app | Must Have |
| SET-08 | Display informational panel explaining how Gist sync works | Nice to Have |

### 4.14 Import and Export

| ID | Requirement | Priority |
|----|-------------|----------|
| IMP-01 | Import items from CSV files with column mapping | Must Have |
| IMP-02 | Import items from Google Sheets via public URL | Must Have |
| IMP-03 | Import items from Amazon baby registry data | Must Have |
| IMP-04 | Parse receipts via client-side OCR (tesseract.js) to extract item names and costs | Nice to Have |
| IMP-05 | Parse PDF receipts via pdfjs-dist for text extraction | Nice to Have |
| IMP-06 | Import receipts into either items list or hospital bag | Nice to Have |
| IMP-07 | Import calendar events as appointments from file | Nice to Have |
| IMP-08 | Import contacts from file | Nice to Have |
| IMP-09 | Import data from email (forward parsing) | Nice to Have |

### 4.15 Sync (GitHub Gist)

| ID | Requirement | Priority |
|----|-------------|----------|
| SYNC-01 | Authenticate via GitHub Personal Access Token with `gist` scope only | Must Have |
| SYNC-02 | Persist PAT and Gist ID in localStorage | Must Have |
| SYNC-03 | Serialize entire `AppStore` to JSON and store as a single file in a private Gist | Must Have |
| SYNC-04 | On push: create Gist if none exists, update if Gist ID is known | Must Have |
| SYNC-05 | On pull: fetch Gist content, deserialize, and replace local AppStore | Must Have |
| SYNC-06 | Track and display last synced timestamp | Must Have |
| SYNC-07 | Display sync status indicator in sidebar (connected/disconnected with last sync time) | Must Have |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| PERF-01 | Initial page load (First Contentful Paint) | < 2 seconds on 4G mobile |
| PERF-02 | Page navigation (client-side route change) | < 200ms |
| PERF-03 | localStorage read/write operations | < 50ms for full store serialization |
| PERF-04 | Static bundle size | Minimize through tree-shaking; no unused dependencies |

### 5.2 Accessibility

| ID | Requirement |
|----|-------------|
| A11Y-01 | All interactive elements must be keyboard accessible |
| A11Y-02 | Color contrast must meet WCAG 2.1 AA for text against backgrounds |
| A11Y-03 | Form inputs must have associated labels |
| A11Y-04 | Touch targets must be at least 44x44px on mobile |
| A11Y-05 | Screen reader support via semantic HTML elements |

### 5.3 Security

| ID | Requirement |
|----|-------------|
| SEC-01 | No data transmitted to any server except GitHub Gist API (opt-in only) |
| SEC-02 | GitHub PAT stored only in localStorage; never sent to any third-party service |
| SEC-03 | Gist scope is the minimum required GitHub permission |
| SEC-04 | Gists created as "secret" (unlisted) by default |
| SEC-05 | No authentication service, no session tokens, no cookies beyond browser defaults |

### 5.4 Data Privacy

| ID | Requirement |
|----|-------------|
| PRIV-01 | All data stored locally by default with no telemetry or analytics |
| PRIV-02 | GitHub sync is opt-in; app is fully functional without it |
| PRIV-03 | No third-party scripts, trackers, or advertising |
| PRIV-04 | OCR and PDF parsing run entirely client-side (tesseract.js, pdfjs-dist) |

### 5.5 Responsiveness

| ID | Requirement |
|----|-------------|
| RESP-01 | Mobile-first design with `md:` breakpoint (768px) for desktop layout |
| RESP-02 | Sidebar: slide-in drawer on mobile (< 768px), fixed 256px panel on desktop |
| RESP-03 | All pages usable and readable on screens 320px wide and larger |
| RESP-04 | Touch-friendly controls with adequate spacing on mobile |

---

## 6. Technical Requirements

### 6.1 Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Next.js (App Router) | 14.2.5 | Modern React with file-based routing |
| UI Library | React | ^18 | Component-based UI |
| Language | TypeScript (strict) | ^5 | Type safety across codebase |
| Styling | Tailwind CSS | ^3.4.1 | Utility-first, rapid development |
| Icons | lucide-react | ^0.400.0 | Consistent, lightweight icon set |
| Class Utilities | clsx | ^2.1.1 | Conditional class name joining |
| PDF Parsing | pdfjs-dist | ^5.6.205 | Client-side PDF text extraction |
| OCR | tesseract.js | ^7.0.0 | Client-side optical character recognition |
| Linting | ESLint + eslint-config-next | ^8 | Code quality enforcement |

### 6.2 Architecture Constraints

| Constraint | Detail |
|-----------|--------|
| Static Export | `output: "export"` in Next.js config; no server-side rendering or API routes |
| Client-Only | All pages use `"use client"` directive; no server components with data fetching |
| Base Path | Production uses `basePath: "/Operation-burrito"` and matching `assetPrefix` for GitHub Pages |
| No `next/image` Optimization | `images.unoptimized: true` required for static export |
| Single Barrel Types | All TypeScript interfaces defined in `src/types/index.ts` |
| Path Alias | `@/*` maps to `./src/*` |

### 6.3 State Management

- **Pattern:** React Context (`StoreProvider`) wrapping the entire app
- **Hook:** `useStore()` custom hook provides all CRUD operations
- **Persistence:** Full `AppStore` serialized to localStorage on every mutation
- **Auto-sync:** Optional auto-push to GitHub Gist after store mutations (when connected)
- **Hydration:** Store loaded from localStorage on mount; `loaded` flag gates rendering

### 6.4 Deployment

| Aspect | Detail |
|--------|--------|
| Platform | GitHub Pages |
| Build | `next build` produces static export |
| CI/CD | GitHub Actions (assumed; standard for GitHub Pages) |
| Domain | `https://<username>.github.io/Operation-burrito/` |
| Cost | Zero |

### 6.5 Component Architecture

```
RootLayout (layout.tsx)
  -> AuthGate (authentication wrapper)
    -> StoreProvider (React Context, localStorage hydration)
      -> Sidebar (fixed desktop / drawer mobile)
      -> <main> content (App Router pages)
```

---

## 7. Data Model

### 7.1 AppStore (Root Entity)

The `AppStore` interface is the single root object persisted to localStorage and synced via GitHub Gist:

```typescript
interface AppStore {
  items: BabyItem[];
  classes: BabyClass[];
  materials: Material[];
  birthPlan: BirthPlan;
  notes: Note[];
  hospitalBag: BagItem[];
  appointments: Appointment[];
  contacts: Contact[];
  contractions: Contraction[];
  registryUrl: string;
}
```

### 7.2 Entity Relationship Summary

```
AppStore (1)
  |-- items (many)          BabyItem[]
  |-- hospitalBag (many)    BagItem[]
  |-- appointments (many)   Appointment[]
  |-- contacts (many)       Contact[]
  |-- classes (many)        BabyClass[]
  |-- materials (many)      Material[]
  |-- notes (many)          Note[]
  |-- contractions (many)   Contraction[]
  |-- birthPlan (one)       BirthPlan
  |-- registryUrl (one)     string
```

All entities use string-based UUIDs for `id` fields. Timestamps are ISO 8601 strings. There are no foreign key relationships between entities; each collection is independent.

### 7.3 Static/Reference Data

- **ChecklistItem[]** — Pre-built checklist loaded from `src/lib/checklistData.ts`. Not persisted in AppStore; serves as reference metadata.
- **AMAZON_PURCHASED_ITEMS** — Registry import data used for inventory matching at initialization.
- **MATCHED_CHECKLIST_IDS** — Set of checklist item IDs matched to inventory items.

### 7.4 Enumerations

| Enum | Values |
|------|--------|
| `ItemCategory` | Nursery, Clothing, Feeding, Safety, Travel, Health & Hygiene, Toys & Gear, Postpartum, Other |
| `ItemPriority` | Must Have, Nice to Have, Optional |
| `ItemTiming` | Pregnancy, Hospital (Pre-birth), Newborn (0-3 months), 1-6 months, Special occasions, Other |
| `BagCategory` | Clothing (Mom), Clothing (Baby), Documents, Toiletries, Comfort & Labour, Feeding, Electronics, Snacks, Other |
| `AppointmentType` | OB / Midwife, Ultrasound, Blood Work, Hospital Tour, Dentist, Specialist, Other |
| `ContactRole` | OB / Doctor, Midwife, Doula, Hospital, Pediatrician, Partner, Family, Other |
| `ClassType` | Childbirth, Breastfeeding, Newborn Care, CPR / First Aid, Parenting, Prenatal Fitness, Other |
| `MaterialType` | PDF / Document, Video, Article, Book, App, Other |
| `NoteCategory` | Appointment, Milestone, Question for Doctor, Hospital Bag, Postpartum Plan, General |

---

## 8. User Flows

### 8.1 First-Time User Setup

1. User opens the app URL in their browser.
2. Dashboard loads immediately with empty state (no items, no due date).
3. User navigates to Birth Plan and enters personal info including due date.
4. Dashboard now shows due date countdown.
5. User navigates to Baby Items and browses the pre-built checklist.
6. User marks items as "Already Have," adds items to their tracking list, or marks items as purchased.
7. User optionally connects GitHub in Settings for backup.

### 8.2 Daily Preparation Workflow

1. User opens Dashboard; sees countdown, stat cards, and must-have items still needed.
2. User purchases an item in real life, then opens Baby Items and marks it as purchased (optionally entering actual cost).
3. User navigates to Budget to review spending versus estimates.
4. User checks Hospital Bag periodically, toggling items as they pack them.
5. User adds new appointments as they are scheduled.

### 8.3 Birth Plan Creation

1. User navigates to Birth Plan.
2. User fills in personal information section (name, due date, medications, allergies).
3. User progresses through labour preferences, selecting comfort measures, pushing preferences, and pain medication preferences via checkboxes and free text.
4. User fills in after-birth section (skin-to-skin, feeding plan, newborn treatments).
5. User fills in interventions section (unexpected events, monitoring, caesarian wishes).
6. Data auto-saves on each field change.

### 8.4 Contraction Timing (Day of Delivery)

1. User opens Contraction Timer.
2. User taps "Start" when contraction begins; a live clock counts up.
3. User taps "Stop" when contraction ends; duration and interval are recorded.
4. History builds as contractions are logged.
5. When the 5-1-1 rule is met (contractions <= 5 min apart, >= 1 min long, for >= 1 hour), a prominent alert appears advising the user to go to the hospital.

### 8.5 Cross-Device Sync

1. User navigates to Settings on Device A.
2. User enters their GitHub PAT and clicks Connect; app verifies the token.
3. User clicks "Push to GitHub"; all data is saved as a private Gist.
4. On Device B, user opens the app and navigates to Settings.
5. User enters the same PAT, connects, then enters the Gist ID from Device A.
6. User clicks "Pull from GitHub"; local data is replaced with the synced data.

### 8.6 Import from External Sources

1. User clicks "Import" on the Items page.
2. CSV Import Modal opens; user uploads a CSV file or pastes a Google Sheets URL.
3. App parses the data and maps columns to BabyItem fields.
4. User reviews and confirms the import; items are added to their tracked list.
5. Alternatively, user clicks "Receipt" to scan a receipt image via OCR.

---

## 9. Future Enhancements

The following features are planned but not yet implemented:

| Enhancement | Description | Estimated Priority |
|-------------|-------------|-------------------|
| **Collaborative sharing** | Partner/family access without requiring GitHub; potential sharing via link or code | High |
| **Push notifications** | Browser notifications for upcoming appointments (1 day before, morning of) | Medium |
| **Due date countdown timeline** | Visual milestone timeline showing key preparation milestones relative to due date | Medium |
| **Photo attachments** | Attach photos to items (product photos), notes, and hospital bag items | Medium |
| **Birth plan PDF export** | Generate a printable PDF of the completed birth plan for hospital distribution | High |
| **Progressive Web App (PWA)** | Service worker for full offline support, install-to-homescreen, push notifications | High |
| **Data export** | Export all data as JSON, CSV, or printable summary | Medium |
| **Undo/redo** | Action history for reversing accidental deletions | Low |
| **Dark mode** | Color scheme toggle for low-light environments | Low |
| **Multi-language support** | Internationalization for non-English users | Low |
| **Merge sync** | Intelligent merge of local and remote changes instead of full overwrite on pull | Medium |

---

## 10. Risks and Dependencies

### 10.1 Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **localStorage quota exceeded** (~5-10 MB per origin) | Low | Low | Data is text-only (no images/blobs); typical usage well under 1 MB. Gist sync offloads backup. Monitor store size and warn if approaching limits. |
| **Browser data clearing** (user clears cache, switches browsers) | Medium | Medium | Prominent encouragement to enable GitHub Gist sync. Display "not synced" warning in sidebar when disconnected. |
| **GitHub PAT stored in localStorage** | Medium | Low | Token scoped to `gist` only (minimal permissions). Educate users on token management. No server-side exposure. |
| **Static export limitations** | Low | Low | App is inherently client-side. No server features needed for current scope. |
| **React hydration mismatches** | Low | Low | All pages use `"use client"`; `loaded` flag prevents rendering before localStorage hydration. |
| **tesseract.js / pdfjs-dist bundle size** | Medium | Medium | These are large libraries. Consider lazy-loading (dynamic import) to avoid impacting initial page load. |

### 10.2 Product Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **No real-time collaboration** | Low | N/A | Primary use case is single user or asynchronous partner use. Push/pull sync is sufficient for v0.1.0. |
| **Checklist data becomes outdated** | Low | Medium | Checklist metadata can be updated in `checklistData.ts` with new releases. |
| **User confusion about sync model** | Medium | Medium | Clear informational panel in Settings explaining push/pull semantics. Confirmation dialogs for destructive actions (pull). |

### 10.3 External Dependencies

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| **GitHub Gist API** | API rate limits, outages, or deprecation | Sync is optional; app works fully offline. Rate limits are generous for single-user push/pull. |
| **GitHub Pages hosting** | Service availability | Standard GitHub infrastructure; high availability. Alternative: any static hosting (Netlify, Vercel, S3). |
| **tesseract.js CDN / worker** | OCR worker download on first use | Bundle worker locally or use service worker caching. Receipt scanning is a nice-to-have feature. |
| **Next.js 14** | Framework updates, potential breaking changes | Pin version in package.json. Static export is a stable, well-supported feature. |

---

## Appendix A: Navigation Structure

The sidebar provides access to all major features:

1. Dashboard (`/`)
2. Baby Items & Checklist (`/items`)
3. Budget (`/budget`)
4. Hospital Bag (`/hospital-bag`)
5. Appointments (`/appointments`)
6. Contacts (`/contacts`)
7. Classes (`/classes`)
8. Materials (`/materials`)
9. Birth Plan (`/birth-plan`)
10. Notes (`/notes`)
11. Contraction Timer (`/timer`)
12. Search (`/search`)
13. Settings (`/settings`) — in sidebar footer

## Appendix B: Design System Reference

| Token | Usage |
|-------|-------|
| `sage-*` | Primary green palette (active states, primary buttons) |
| `blush-*` | Accent pink/red palette |
| `stone-*` | Neutral text, borders, backgrounds |
| `.btn-primary` | Primary action button |
| `.btn-secondary` | Secondary action button |
| `.card` | Content container with border and shadow |
| `.input`, `.select`, `.textarea` | Form input styles |
| `.badge` | Small status/category labels |
| `.label` | Form field labels |
