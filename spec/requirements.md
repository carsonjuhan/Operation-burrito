# Operation Burrito — Requirements

Status legend: ✓ Done · ◐ Partial · ○ Planned

---

## 1. Core Tracking

### Baby Items Shopping List
- ✓ Add / edit / delete items with name, category, priority, estimated cost, actual cost, notes, link
- ✓ Mark items as purchased / unpurchased
- ✓ Filter by category, priority, and purchased status
- ✓ Progress indicator: X of Y purchased
- ✓ Budget strip: estimated total / spent so far / still needed
- ○ View registry link from items page header

### Hospital Bag
- ✓ Pre-populated checklist of 32 items across 9 categories
- ✓ Check/uncheck items as packed
- ✓ Pack All / Unpack All bulk actions
- ✓ Add custom items with category and quantity
- ✓ Progress bar (packed / total)

### Appointments
- ✓ Track appointments with title, type, date, time, provider, location, notes
- ✓ Types: OB/Midwife, Ultrasound, Blood Work, Hospital Tour, Dentist, Specialist, Other
- ✓ Mark appointments as completed
- ✓ Sort: upcoming (asc) / past (desc)
- ✓ Import from .ics calendar file (Google Calendar, Apple Calendar)

### Key Contacts
- ✓ Store contacts with name, role, phone, email, notes
- ✓ Roles: OB/Doctor, Midwife, Doula, Hospital, Pediatrician, Partner, Family, Other
- ✓ Clickable tel: and mailto: links
- ✓ Import from .vcf vCard files (bulk multi-contact)
- ✓ Import sender from .eml email files

### Prenatal Classes
- ✓ Track classes with name, type, provider, date, location, cost, notes
- ✓ Types: Childbirth, Breastfeeding, Newborn Care, CPR/First Aid, Parenting, Prenatal Fitness, Other
- ✓ Mark classes as completed

### Learning Materials
- ✓ Save resources with title, type, topic, URL, notes
- ✓ Types: PDF/Document, Video, Article, Book, App, Other
- ✓ Filter by type and keyword search

### Birth Plan
- ✓ Structured 4-tab form matching BC Women's Hospital Labour & Birth Guide
- ✓ Tab 1: Personal Info (name, due date, medications, allergies)
- ✓ Tab 2: Labour & Birth (support people, comfort measures, pain medication, pushing preferences, atmosphere, cord blood)
- ✓ Tab 3: After Birth (skin-to-skin, cord cutting, feeding plan, newborn treatments, visitors)
- ✓ Tab 4: Interventions (unexpected events, monitoring, prolonged labour, assisted birth, caesarean, special care)
- ✓ Auto-save on change
- ✓ Save as PDF: all 4 tabs print together via @media print

### Notes
- ✓ Create notes with title, content, category
- ✓ Categories: Appointment, Milestone, Question for Doctor, Hospital Bag, Postpartum Plan, General
- ✓ Pin important notes (appear at top)
- ✓ Full-text search within notes

### Contraction Timer
- ✓ Start / stop timer for each contraction
- ✓ Track duration (seconds) and interval between contractions
- ✓ 5-1-1 rule indicator (contractions 5 min apart, 1+ min long, for 1+ hour)
- ✓ Log of recent contractions with duration / interval / time
- ✓ Clear all with confirmation

---

## 2. Dashboard

- ✓ Due date countdown banner (colour-coded: green >6wk, amber 2-6wk, rose <2wk)
- ✓ Stat cards: Items purchased, Bag packed, Birth plan progress, Classes completed
- ✓ Budget strip: estimated total / spent / still needed
- ✓ Must-have items still needed (up to 6)
- ✓ Upcoming appointments widget (next 3)
- ✓ Pinned notes widget (up to 3)
- ✓ Materials count
- ○ Amazon baby registry link card
- ○ Link to budget analytics page

---

## 3. Global Search

- ✓ Search across: items, appointments, contacts, classes, notes, materials, hospital bag
- ✓ Results grouped by section with icons
- ✓ Keyword highlighting in results
- ✓ Instant keystroke search (no submit needed)

---

## 4. Data Persistence & Sync

- ✓ All data stored in localStorage (key: `operation-burrito-store`)
- ✓ Survives page refresh, browser close, and device restart
- ✓ GitHub Gist sync (optional): Push full store to private secret Gist
- ✓ GitHub Gist sync: Pull from Gist on new device
- ✓ Auto-sync: debounced 5-second push on every store change when PAT configured
- ✓ Sync status shown in sidebar (connected / last synced time)
- ✓ Multi-device support via Gist ID + PAT

---

## 5. Data Import

### Receipt Import (images + PDFs)
- ✓ Upload receipt photo (JPG, PNG, HEIC, WEBP) → OCR via Tesseract.js
- ✓ Upload receipt PDF → text extraction via pdfjs-dist
- ✓ Review extracted items with editable names and prices
- ✓ Import to Baby Items (purchased=true) or Hospital Bag
- ○ Cross-reference against existing items list (fuzzy match)

### Calendar Import (.ics)
- ✓ Upload .ics file → parse iCalendar VEVENT blocks
- ✓ Review events with auto-detected appointment types
- ✓ Bulk import to Appointments

### Contact Import (vCard / Email)
- ✓ Upload .vcf → parse vCard contacts with role assignment
- ✓ Upload .eml → extract sender as contact or parse body as appointment
- ✓ Bulk import to Contacts

### Spreadsheet Import (Google Sheets / CSV)
- ○ Paste Google Sheets URL → auto-fetch CSV (if sheet is public)
- ○ Upload .csv file → parse rows
- ○ Smart column mapping: auto-detect Name, Category, Cost, Priority, Status, Notes, Link columns
- ○ Preview mapped rows before importing
- ○ Bulk import to Baby Items

---

## 6. Amazon Baby Registry

- ○ Store Amazon registry URL in app settings
- ○ Display "View Registry →" link on Items page header
- ○ Display registry link card on Dashboard
- ○ Cross-reference imported receipt items against registry (fuzzy name match)

---

## 7. Purchase Analytics (`/budget`)

- ○ Spending by category: estimated vs actual per ItemCategory (horizontal bar chart)
- ○ Missing critical items: all Must Have items not yet purchased, sorted by cost
- ○ Quick-purchase action inline on missing items list
- ○ Running totals: grand estimated, actual spent, remaining, spent this month
- ○ Registry URL link for cross-reference

---

## 8. Authentication

- ✓ Password gate wrapping entire app
- ✓ Password configurable via GitHub Secret `APP_PASSWORD` (default: `burrito`)
- ✓ Auth state in sessionStorage (per-tab, clears on tab close)
- ✓ Shake animation on wrong password

---

## 9. Mobile & Accessibility

- ✓ Mobile-responsive layout (hamburger sidebar on mobile, always-visible on desktop)
- ✓ Sidebar: slide-in with overlay on mobile
- ✓ All pages: full-width on mobile with bottom padding for scroll
- ✓ Touch-friendly button sizes

---

## 10. Deployment

- ✓ Static export (`output: "export"`) → works on GitHub Pages
- ✓ `basePath` and `assetPrefix` set to `/Operation-burrito` in production
- ✓ GitHub Actions workflow: push to `main` → build → deploy
- ✓ `APP_PASSWORD` secret injected at build time via Actions
- ✓ Deployed at: `https://carsonjuhan.github.io/Operation-burrito/`

---

## Non-Functional Requirements

- ✓ All data stays client-side (no external server storing personal health info)
- ✓ Works offline (core features require no internet)
- ✓ No third-party analytics or tracking
- ✓ Zero-dependency state management (React Context + hooks only)
- ✓ TypeScript strict mode throughout
- ✓ No external chart libraries (CSS-only charts for budget page)
- ✓ Lazy-loaded heavy dependencies (Tesseract.js, pdfjs) to keep initial bundle small
