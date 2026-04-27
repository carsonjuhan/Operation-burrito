# Epics and Stories -- Operation Burrito

**Version:** 0.1.0
**Last Updated:** 2026-04-21
**Status:** Active

---

## Summary

This document defines all epics and stories for Operation Burrito. Existing implemented features are marked Complete. Remaining work focuses on infrastructure gaps (testing, error handling), data reliability, UX polish, and future enhancements identified in the PRD and architecture documents.

**Story Point Scale:** 1 (trivial) / 2 (small) / 3 (medium) / 5 (large) / 8 (extra large) / 13 (epic-sized)

---

## E-001: Core Infrastructure and Quality

**Priority:** P0
**Status:** In Progress
**Description:** Establish the foundational quality infrastructure missing from the project: automated testing, CI quality gates, error boundaries, and developer tooling. The CI/CD pipeline exists (`deploy.yml`) but has no lint or test steps. There are zero test files in the codebase. No React error boundaries protect against runtime crashes.

---

### S-001: Add Testing Framework and Configuration

**Epic:** E-001
**Status:** Planned
**Story Points:** 3
**Description:** Install and configure a testing framework (Vitest or Jest) with React Testing Library. Set up path aliases, TypeScript support, and a test script in `package.json`.

**Acceptance Criteria:**
- Test runner (Vitest or Jest) is installed and configured
- React Testing Library is installed for component tests
- `@/*` path alias works in test files
- `npm test` runs the test suite and exits with appropriate code
- A single smoke test proves the setup works (e.g., renders a component)
- `tsconfig` includes test files without breaking the build

---

### S-002: Unit Tests for Utility Libraries

**Epic:** E-001
**Status:** Planned
**Story Points:** 5
**Description:** Write unit tests for the critical utility modules: `csvImporter.ts`, `receiptParser.ts`, `inventoryMatching.ts`, `importParsers.ts` (ICS, vCard, EML parsing), and `gistSync.ts`.

**Acceptance Criteria:**
- `csvImporter.ts` tests cover: valid CSV parsing, quoted fields, column auto-mapping, Google Sheets URL conversion, edge cases (empty rows, missing headers)
- `receiptParser.ts` tests cover: text-to-item parsing, price extraction, line filtering (totals, tax excluded)
- `inventoryMatching.ts` tests cover: exact match, normalized match, unmatched inventory items
- `importParsers.ts` tests cover: ICS event parsing, vCard contact parsing, EML header extraction
- `gistSync.ts` tests cover: push/pull API calls (mocked), PAT/Gist ID persistence helpers
- All tests pass in CI

---

### S-003: Component Tests for Critical Flows

**Epic:** E-001
**Status:** Planned
**Story Points:** 5
**Description:** Write component/integration tests for the most critical user flows: Dashboard rendering, item CRUD, birth plan auto-save, contraction timer, and settings/sync.

**Acceptance Criteria:**
- Dashboard test: renders stats, countdown, and quick links with mock store data
- Items page test: add item, mark purchased, delete item
- Birth plan test: fields auto-save on change
- Contraction timer test: start/stop records duration, 5-1-1 rule triggers alert
- Settings test: connect/disconnect flow renders correct UI states
- Tests use a mock StoreContext provider

---

### S-004: Add Lint and Test Steps to CI Pipeline

**Epic:** E-001
**Status:** Planned
**Story Points:** 2
**Description:** Update `.github/workflows/deploy.yml` to run ESLint and tests before the build step. Fail the pipeline if either step fails. Currently the pipeline only runs `npm ci` and `npm run build`.

**Acceptance Criteria:**
- `npm run lint` step runs before build and fails the pipeline on lint errors
- `npm test` step runs before build and fails the pipeline on test failures
- Build step only executes if lint and tests pass
- Pipeline still deploys to GitHub Pages on success

---

### S-005: Add React Error Boundaries

**Epic:** E-001
**Status:** Planned
**Story Points:** 3
**Description:** Add React Error Boundary components to catch runtime errors and display a user-friendly fallback instead of a white screen. Wrap each major page section independently so one failing section does not crash the entire app.

**Acceptance Criteria:**
- A reusable `ErrorBoundary` component is created in `src/components/`
- Each page route is wrapped with an error boundary (via `error.tsx` files or component wrapping)
- Fallback UI shows a friendly message with a "Reload" button
- Sidebar and navigation remain functional when a page crashes
- Error details are logged to the console for debugging

---

### S-006: Add localStorage Size Monitoring

**Epic:** E-001
**Status:** Planned
**Story Points:** 2
**Description:** Monitor localStorage usage after each write and warn the user when approaching the browser's storage limit. Display current usage in the Settings page.

**Acceptance Criteria:**
- After each store save, calculate the approximate size of the stored data
- If usage exceeds 80% of estimated limit (4MB of ~5MB), show a warning badge in the sidebar
- Settings page displays current data size (e.g., "1.2 MB of ~5 MB used")
- Warning suggests enabling GitHub Gist sync as a backup

---

---

## E-002: Data Reliability and Sync

**Priority:** P0
**Status:** In Progress
**Description:** Improve data reliability, sync robustness, and data portability. The current sync model is full-overwrite with no conflict detection. There is no data validation on import or sync pull. No export functionality exists.

---

### S-007: Data Validation on Sync Pull

**Epic:** E-002
**Status:** Planned
**Story Points:** 3
**Description:** Validate data integrity when pulling from GitHub Gist. Ensure the pulled JSON conforms to the `AppStore` schema before overwriting local data. Reject or warn on malformed data.

**Acceptance Criteria:**
- Pulled data is validated against expected shape (all required arrays present, correct field types)
- Missing fields are filled with defaults (backward-compatible migration)
- Completely invalid JSON shows an error message instead of silently corrupting local state
- A pre-pull snapshot is saved to a separate localStorage key for recovery
- User can restore from the snapshot if the pull results in data corruption

---

### S-008: Conflict Detection for Sync

**Epic:** E-002
**Status:** Planned
**Story Points:** 5
**Description:** Detect when local changes and remote Gist changes have diverged since the last sync. Warn the user before a pull would overwrite unsaved local changes, and before a push would overwrite newer remote changes.

**Acceptance Criteria:**
- Track a `lastModifiedAt` timestamp that updates on every local mutation
- On pull: compare local `lastModifiedAt` with `lastSynced`; if local changes exist since last sync, show a confirmation dialog with details
- On push: fetch Gist `updated_at` and compare with `lastSynced`; if remote is newer, warn that pushing will overwrite remote changes
- User can choose to proceed or cancel in both cases
- Timestamps are displayed in a human-readable format

---

### S-009: JSON Data Export

**Epic:** E-002
**Status:** Planned
**Story Points:** 2
**Description:** Allow users to export their entire `AppStore` as a downloadable JSON file from the Settings page.

**Acceptance Criteria:**
- "Export Data" button on the Settings page triggers a JSON file download
- Filename includes a timestamp (e.g., `operation-burrito-2026-04-21.json`)
- Exported JSON is the full `AppStore` (same format as Gist sync)
- Works offline (no network request required)

---

### S-010: JSON Data Import

**Epic:** E-002
**Status:** Planned
**Story Points:** 3
**Description:** Allow users to import a previously exported JSON file to restore their data, as an alternative to GitHub Gist sync.

**Acceptance Criteria:**
- "Import Data" button on the Settings page opens a file picker for `.json` files
- Imported data is validated against the AppStore schema (same validation as S-007)
- Confirmation dialog warns that import will replace all local data
- On success, the store is updated and a success message is shown
- On validation failure, an error message describes what was wrong

---

### S-011: Auto-Sync Error Handling and Retry

**Epic:** E-002
**Status:** Planned
**Story Points:** 3
**Description:** The current auto-sync silently swallows errors. Improve error handling to surface sync failures to the user and implement retry with backoff.

**Acceptance Criteria:**
- Failed auto-sync attempts show a non-intrusive notification (toast or sidebar indicator)
- After 3 consecutive failures, auto-sync pauses and shows a persistent warning
- User can manually retry or dismiss the warning
- Network errors vs. authentication errors show different messages
- Successful sync after failure clears the warning state

---

---

## E-003: UX Polish and Accessibility

**Priority:** P1
**Status:** Planned
**Description:** Improve the user experience with better loading states, empty states, skeleton loaders, animations, and accessibility compliance. Address WCAG 2.1 AA requirements from the PRD.

---

### S-012: Consistent Loading States Across All Pages

**Epic:** E-003
**Status:** Planned
**Story Points:** 3
**Description:** Replace the minimal "Loading..." text on each page with consistent, visually polished skeleton loaders that match the layout of the loaded content.

**Acceptance Criteria:**
- Each page displays a skeleton loader that matches its final layout shape
- Skeleton components use a consistent animation (shimmer/pulse)
- A shared `Skeleton` component is created in `src/components/`
- Loading states appear for less than the `loaded` flag gate duration (no flash)
- No layout shift when real content replaces the skeleton

---

### S-013: Enhanced Empty States

**Epic:** E-003
**Status:** In Progress
**Story Points:** 2
**Description:** The `EmptyState` component exists but review all pages to ensure every empty collection has a clear empty state with illustration, message, and a primary call-to-action.

**Acceptance Criteria:**
- Every page with a list (items, appointments, contacts, classes, materials, notes, hospital bag) shows the EmptyState component when the collection is empty
- Each empty state has a relevant icon, descriptive message, and a "Add your first..." button
- Empty states are visually consistent across all pages
- Dashboard handles the fully-empty state gracefully (new user experience)

---

### S-014: Accessibility Audit and Fixes

**Epic:** E-003
**Status:** Planned
**Story Points:** 5
**Description:** Run an accessibility audit (axe-core / Lighthouse) and fix all violations to meet WCAG 2.1 AA. The PRD requires keyboard navigation, color contrast, labeled inputs, and minimum touch targets.

**Acceptance Criteria:**
- All interactive elements are keyboard-accessible (Tab, Enter, Escape)
- All form inputs have associated `<label>` elements or `aria-label`
- Color contrast meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Touch targets are at least 44x44px on mobile
- Modal dialogs trap focus and can be closed with Escape
- Sidebar drawer is accessible (focus trap on mobile, escape to close)
- Lighthouse accessibility score is 90+

---

### S-015: Keyboard Shortcuts

**Epic:** E-003
**Status:** Planned
**Story Points:** 3
**Description:** Add keyboard shortcuts for common actions to improve power-user efficiency.

**Acceptance Criteria:**
- `Cmd/Ctrl + K` opens global search
- `Escape` closes any open modal
- Arrow keys navigate sidebar items (when sidebar is focused)
- A keyboard shortcut help overlay is accessible via `?` key
- Shortcuts do not conflict with browser defaults

---

### S-016: Page Transition Animations

**Epic:** E-003
**Status:** Planned
**Story Points:** 2
**Description:** Add subtle page transition animations and micro-interactions to improve perceived performance and polish.

**Acceptance Criteria:**
- Page content fades in on route change
- List items animate in with a staggered reveal
- Toggle actions (pack/unpack, purchase/unpurchase) have a smooth transition
- Animations respect `prefers-reduced-motion` media query
- No jank or layout shift caused by animations

---

### S-017: Toast Notification System

**Epic:** E-003
**Status:** Planned
**Story Points:** 3
**Description:** Add a toast notification system for confirming user actions (item added, data synced, import complete, etc.) instead of relying solely on inline state changes.

**Acceptance Criteria:**
- A reusable `Toast` component supports success, error, warning, and info variants
- Toasts appear in a fixed position (bottom-right or top-center)
- Toasts auto-dismiss after 3-5 seconds with a close button
- Multiple toasts stack without overlapping
- Key actions trigger toasts: item added/deleted, sync push/pull, import complete, export complete

---

---

## E-004: PWA and Offline Support

**Priority:** P1
**Status:** Planned
**Description:** Convert the app into a Progressive Web App with service worker caching, install-to-homescreen prompt, and full offline capability. This is a high-priority future enhancement from the PRD.

---

### S-018: Service Worker and Caching Strategy

**Epic:** E-004
**Status:** Planned
**Story Points:** 8
**Description:** Implement a service worker that caches the static shell (HTML, JS, CSS) and enables the app to work offline after the initial visit. Use a cache-first strategy for static assets and network-first for the Gist API.

**Acceptance Criteria:**
- Service worker is registered on first visit
- All static assets (HTML, JS, CSS, icons) are cached on install
- App loads and is fully functional offline after initial cache
- Gist sync gracefully degrades when offline (queues for retry)
- Cache is updated when a new version is deployed (stale-while-revalidate)
- Service worker does not interfere with development (only active in production)

---

### S-019: Web App Manifest and Install Prompt

**Epic:** E-004
**Status:** Planned
**Story Points:** 3
**Description:** Add a web app manifest with icons, theme colors, and display configuration. Implement a custom install prompt for Add to Home Screen.

**Acceptance Criteria:**
- `manifest.json` is present with name, short_name, icons (192px, 512px), theme_color, background_color, display: "standalone"
- App icons use the burrito theme in multiple sizes
- Custom install banner appears after 2+ visits (using `beforeinstallprompt` event)
- Installed app opens in standalone mode without browser chrome
- App displays correctly on iOS (Apple meta tags) and Android

---

### S-020: Offline Indicator and Sync Queue

**Epic:** E-004
**Status:** Planned
**Story Points:** 3
**Description:** Show a visual indicator when the app is offline and queue sync operations for when connectivity returns.

**Acceptance Criteria:**
- A banner or badge appears when the browser goes offline
- Banner disappears when connectivity is restored
- Sync operations attempted while offline are queued
- Queued syncs execute automatically when online status returns
- Queue is persisted in localStorage to survive page refreshes

---

---

## E-005: Import, Export, and Print Enhancements

**Priority:** P2
**Status:** Planned
**Description:** Enhance data portability with birth plan PDF export, CSV export for item lists, and improvements to the existing import pipeline.

---

### S-021: Birth Plan PDF Export

**Epic:** E-005
**Status:** Planned
**Story Points:** 8
**Description:** Generate a clean, printable PDF of the completed birth plan for distribution to hospital staff, doulas, and support people. This is a high-priority future enhancement from the PRD.

**Acceptance Criteria:**
- "Export as PDF" button on the Birth Plan page generates a downloadable PDF
- PDF includes all completed birth plan sections in a clear, readable layout
- Sections with no data are omitted or marked as "Not specified"
- PDF header includes patient name, due date, and generation date
- PDF is formatted for standard letter/A4 paper
- Works entirely client-side (using a library like jsPDF or html2pdf.js)
- PDF includes a footer noting it was generated by Operation Burrito

---

### S-022: CSV Export for Baby Items

**Epic:** E-005
**Status:** Planned
**Story Points:** 3
**Description:** Export the baby items list as a CSV file for sharing with partners, family, or for use in spreadsheets.

**Acceptance Criteria:**
- "Export CSV" button on the Items page triggers a CSV file download
- CSV includes columns: name, category, priority, timing, purchased, estimated cost, actual cost, notes, link
- Filename includes a timestamp
- Both "All Items" and "My Tracked Items" views have export buttons (exporting the current view)
- CSV uses proper escaping for fields containing commas or quotes

---

### S-023: Printable Hospital Bag Checklist

**Epic:** E-005
**Status:** Planned
**Story Points:** 2
**Description:** Generate a print-friendly view of the hospital bag checklist that can be printed directly from the browser.

**Acceptance Criteria:**
- "Print Checklist" button on the Hospital Bag page opens browser print dialog
- Print layout groups items by category with checkboxes
- Packed items show as checked, unpacked as empty checkboxes
- Print layout hides navigation, buttons, and other non-essential UI
- Uses `@media print` CSS rules

---

### S-024: Improve Receipt Scanner UX

**Epic:** E-005
**Status:** Planned
**Story Points:** 3
**Description:** Improve the receipt import flow with better progress indication, error messaging, and the ability to edit parsed items before import.

**Acceptance Criteria:**
- Progress bar shows OCR/PDF parsing progress
- Parsed items are displayed in an editable table before import
- User can correct item names and prices before confirming
- User can deselect items they do not want to import
- Clear error messages for unsupported file types or parsing failures
- Loading the tesseract.js/pdfjs-dist libraries shows a "Loading scanner..." state

---

### S-025: Bundle pdfjs-dist Worker Locally

**Epic:** E-005
**Status:** Planned
**Story Points:** 2
**Description:** The PDF.js worker is currently loaded from the unpkg CDN, creating an external runtime dependency. Bundle it locally so PDF parsing works fully offline.

**Acceptance Criteria:**
- PDF.js worker file is copied to the `public/` directory at build time
- `receiptParser.ts` references the local worker path instead of unpkg URL
- PDF parsing works without internet access (after initial app load)
- No increase in the main JavaScript bundle size (worker is a separate file)

---

---

## E-006: Collaboration and Sharing

**Priority:** P2
**Status:** Planned
**Description:** Enable partner and family access to shared data without requiring GitHub. Support read-only sharing for baby shower organizers and support people.

---

### S-026: Shareable Read-Only Birth Plan Link

**Epic:** E-006
**Status:** Planned
**Story Points:** 5
**Description:** Generate a shareable URL that allows others (doulas, family, hospital staff) to view the birth plan without editing access. Use the existing Gist infrastructure.

**Acceptance Criteria:**
- "Share Birth Plan" button generates a read-only link
- Link opens a clean, styled view of the birth plan (no navigation or editing controls)
- Link uses the public Gist raw URL or a custom hash-based approach
- Shared view works without authentication
- Sharer can revoke access by regenerating the link
- Shared view clearly indicates it is read-only

---

### S-027: Shareable Registry/Checklist View

**Epic:** E-006
**Status:** Planned
**Story Points:** 5
**Description:** Generate a shareable view of the baby items list showing what has been purchased and what is still needed, useful for baby shower organizers.

**Acceptance Criteria:**
- "Share List" button generates a read-only link to the items list
- Shared view shows items grouped by category with purchased/needed status
- Purchased items are visually distinct (strikethrough or checkmark)
- No editing capability in the shared view
- Optional: viewer can mark an item as "I'll get this" (stored separately, not in main store)

---

---

## E-007: Notifications and Reminders

**Priority:** P3
**Status:** Planned
**Description:** Implement browser notifications for appointment reminders and due date milestones. Requires PWA support (E-004) for background notifications.

---

### S-028: Appointment Reminder Notifications

**Epic:** E-007
**Status:** Planned
**Story Points:** 5
**Description:** Send browser notifications to remind users of upcoming appointments. Requires notification permission and service worker from E-004.

**Acceptance Criteria:**
- User can enable/disable appointment reminders in Settings
- Notification permission is requested when reminders are enabled
- Reminders fire 1 day before and on the morning of each appointment
- Notification includes appointment title, type, time, and location
- Clicking the notification opens the Appointments page
- Reminders work even when the app tab is not active (service worker)

---

### S-029: Due Date Countdown Milestones

**Epic:** E-007
**Status:** Planned
**Story Points:** 3
**Description:** Display milestone notifications as the due date approaches: 12 weeks, 8 weeks, 4 weeks, 2 weeks, 1 week, and due date.

**Acceptance Criteria:**
- Milestone notifications are triggered based on the birth plan due date
- Each milestone includes a contextual message (e.g., "4 weeks to go -- is your hospital bag packed?")
- Milestones link to relevant pages (hospital bag, items, birth plan)
- Milestones are shown on the dashboard as a timeline widget
- Already-passed milestones are marked as complete

---

---

## E-008: Visual Enhancements and Theming

**Priority:** P3
**Status:** Planned
**Description:** Add visual improvements including dark mode, due date timeline, and photo attachments.

---

### S-030: Dark Mode

**Epic:** E-008
**Status:** Planned
**Story Points:** 5
**Description:** Add a dark mode theme toggle using Tailwind's `dark:` variant. Persist the preference in localStorage.

**Acceptance Criteria:**
- Theme toggle in sidebar footer or Settings page switches between light and dark
- All pages render correctly in dark mode with appropriate contrast
- Theme preference is saved to localStorage and restored on load
- Respects `prefers-color-scheme` system setting as default
- Custom `sage-*` and `blush-*` colors have dark mode equivalents
- No flash of wrong theme on page load (theme applied before render)

---

### S-031: Due Date Milestone Timeline

**Epic:** E-008
**Status:** Planned
**Story Points:** 5
**Description:** Add a visual milestone timeline to the Dashboard showing key preparation milestones relative to the due date. This is a medium-priority future enhancement from the PRD.

**Acceptance Criteria:**
- Timeline displays key milestones: start tracking, register for classes, hospital tour, pack hospital bag, install car seat, due date
- Current position on the timeline is highlighted based on today's date
- Completed milestones (based on app data) are marked with a check
- Timeline is responsive (horizontal on desktop, vertical on mobile)
- Milestones link to their relevant pages

---

### S-032: Photo Attachments for Items and Notes

**Epic:** E-008
**Status:** Planned
**Story Points:** 8
**Description:** Allow users to attach photos to items (product photos) and notes. Photos are stored as base64 data URLs in localStorage. This is a medium-priority future enhancement from the PRD.

**Acceptance Criteria:**
- Items and notes have an "Attach Photo" button that opens a file picker or camera
- Photos are resized client-side to a maximum dimension (e.g., 800px) to control storage
- Attached photos display as thumbnails in list views and full-size in detail views
- Photos are included in the AppStore and sync via Gist
- localStorage size warning (S-006) accounts for photo storage
- Users can remove attached photos

---

---

## E-009: Performance Optimization

**Priority:** P2
**Status:** Planned
**Description:** Address performance concerns identified in the architecture document: context re-render optimization, list virtualization, and bundle size improvements.

---

### S-033: Split Store Context by Domain

**Epic:** E-009
**Status:** Planned
**Story Points:** 8
**Description:** The current single React Context causes all consuming components to re-render on any store mutation. Split into domain-specific contexts or migrate to Zustand with selectors for targeted re-renders.

**Acceptance Criteria:**
- Store is split into logical domains (e.g., items, notes, birthPlan, settings) OR migrated to a selector-based library
- Components only re-render when their specific data changes
- All existing functionality continues to work
- localStorage persistence behavior is unchanged
- Auto-sync to Gist still works across all domains
- Performance improvement is measurable (fewer re-renders on mutation)

---

### S-034: List Virtualization for Large Collections

**Epic:** E-009
**Status:** Planned
**Story Points:** 3
**Description:** Implement virtual scrolling for the baby items checklist (100+ items) and any other large lists to prevent jank on low-end mobile devices.

**Acceptance Criteria:**
- Baby items list uses virtualization (e.g., `react-window` or `@tanstack/virtual`) when item count exceeds a threshold (e.g., 50 items)
- Scrolling is smooth on mobile devices
- All existing functionality (filtering, grouping, inline edit) works with virtualized list
- Non-virtualized rendering is used for small lists (no unnecessary complexity)

---

### S-035: Lazy-Load Checklist and Registry Reference Data

**Epic:** E-009
**Status:** Planned
**Story Points:** 3
**Description:** The checklist metadata (~100+ items) and registry data are imported at build time and embedded in the JS bundle. Load them on demand to reduce initial bundle size.

**Acceptance Criteria:**
- Checklist data is loaded via dynamic `import()` when the Items page is first visited
- Registry data is loaded on demand when inventory matching is needed
- A loading state is shown while data loads
- Data is cached after first load (no re-fetching on subsequent visits)
- Initial JS bundle size is measurably reduced

---

### S-036: Consistent useMemo for Expensive Computations

**Epic:** E-009
**Status:** Planned
**Story Points:** 2
**Description:** Audit all pages for expensive computations (filtering, grouping, sorting) that run on every render and wrap them in `useMemo` with appropriate dependency arrays.

**Acceptance Criteria:**
- All filtered/grouped/sorted views use `useMemo`
- Dashboard stat calculations use `useMemo`
- Budget chart data computation uses `useMemo`
- Search results filtering uses `useMemo`
- No `useMemo` hooks appear after early return statements (Rules of Hooks compliance)

---

---

## E-010: Existing Feature Completion (Complete)

**Priority:** P0
**Status:** Complete
**Description:** All core features specified in the PRD v0.1.0 have been implemented. This epic tracks the completed work for reference.

---

### S-037: Dashboard with Countdown and Stats

**Epic:** E-010
**Status:** Complete
**Story Points:** 5
**Description:** Dashboard with due date countdown, stat cards, budget summary, must-have items, upcoming appointments, and pinned notes.

**Acceptance Criteria:**
- [x] Due date countdown with color-coded urgency
- [x] Four stat cards (items, bag, birth plan, classes)
- [x] Budget summary strip
- [x] Must-have items list
- [x] Upcoming appointments list
- [x] Pinned notes display
- [x] Amazon registry quick-link

---

### S-038: Baby Items and Checklist System

**Epic:** E-010
**Status:** Complete
**Story Points:** 8
**Description:** Full baby items management with pre-built checklist, custom items, categories, priorities, timing, filtering, and status tracking.

**Acceptance Criteria:**
- [x] Pre-built checklist from curated metadata
- [x] Custom item creation with all fields
- [x] Nine item categories, three priorities, six timing groups
- [x] Collapsible category sections with progress bars
- [x] Four status types (need, in-list, purchased, already-have)
- [x] Quick actions (Add to List, Mark Bought, Already Have)
- [x] Filtering by timing, status, category, priority
- [x] All Items vs. My Tracked Items toggle
- [x] Inline edit and delete
- [x] Inventory matching from Amazon registry

---

### S-039: Budget and Analytics

**Epic:** E-010
**Status:** Complete
**Story Points:** 5
**Description:** Budget tracking with summary cards, category breakdown chart, and unpurchased must-have items list.

**Acceptance Criteria:**
- [x] Four summary cards (estimated, actual, still needed, this month)
- [x] Spending breakdown by category with chart
- [x] Unpurchased must-have items sorted by cost
- [x] Amazon registry reference link

---

### S-040: Hospital Bag Checklist

**Epic:** E-010
**Status:** Complete
**Story Points:** 3
**Description:** Hospital bag packing checklist with default items, custom items, categories, packed status, and progress tracking.

**Acceptance Criteria:**
- [x] Pre-populated default items across nine categories
- [x] Pack/unpack toggle per item
- [x] Custom bag item creation
- [x] Quantity tracking
- [x] Packing progress percentage

---

### S-041: Birth Plan Builder

**Epic:** E-010
**Status:** Complete
**Story Points:** 8
**Description:** Comprehensive birth plan with personal info, labour preferences, comfort measures, pain medication, after-birth preferences, and intervention preferences.

**Acceptance Criteria:**
- [x] Personal information section
- [x] Labour preferences with comfort measures
- [x] Pushing and pain medication preferences
- [x] After-birth preferences (skin-to-skin, feeding, treatments)
- [x] Intervention preferences
- [x] Auto-save on field change
- [x] Completion tracking on dashboard

---

### S-042: Appointments, Contacts, Classes, Materials, Notes

**Epic:** E-010
**Status:** Complete
**Story Points:** 5
**Description:** CRUD operations for appointments, contacts, classes, educational materials, and notes with categories and filtering.

**Acceptance Criteria:**
- [x] Appointments with types, date/time, provider, completion
- [x] Contacts with roles, phone, email
- [x] Classes with types, provider, completion, cost
- [x] Materials with types, topics, URLs
- [x] Notes with categories, pinning, timestamps

---

### S-043: Contraction Timer

**Epic:** E-010
**Status:** Complete
**Story Points:** 5
**Description:** Real-time contraction timer with duration tracking, interval calculation, history, and 5-1-1 rule alert.

**Acceptance Criteria:**
- [x] Start/stop timer with live clock
- [x] Duration and interval recording
- [x] Reverse chronological history
- [x] 5-1-1 rule visual alert
- [x] Individual contraction deletion

---

### S-044: Global Search

**Epic:** E-010
**Status:** Complete
**Story Points:** 3
**Description:** Search across all data types with grouped results and real-time filtering.

**Acceptance Criteria:**
- [x] Searches items, notes, materials, classes, appointments, contacts, bag items
- [x] Results grouped by section with icons
- [x] Links to relevant pages
- [x] Real-time filtering as user types

---

### S-045: GitHub Gist Sync

**Epic:** E-010
**Status:** Complete
**Story Points:** 5
**Description:** Cross-device sync via GitHub Gist with PAT authentication, push/pull, auto-sync, and sync status display.

**Acceptance Criteria:**
- [x] PAT entry and verification
- [x] Push to Gist (create or update)
- [x] Pull from Gist with confirmation
- [x] Gist ID display with link
- [x] New device flow (enter existing Gist ID)
- [x] Disconnect with confirmation
- [x] Sync status in sidebar
- [x] Debounced auto-sync after mutations

---

### S-046: Import Pipeline (CSV, Sheets, Amazon, Receipt, ICS, vCard, EML)

**Epic:** E-010
**Status:** Complete
**Story Points:** 8
**Description:** Multi-source import pipeline: CSV files, Google Sheets, Amazon registry, receipt OCR/PDF, calendar ICS, vCard contacts, and email parsing.

**Acceptance Criteria:**
- [x] CSV import with column mapping
- [x] Google Sheets import via public URL
- [x] Amazon registry import with inventory matching
- [x] Receipt scanning via tesseract.js OCR
- [x] PDF receipt parsing via pdfjs-dist
- [x] ICS calendar import
- [x] vCard contact import
- [x] Email import parsing

---

### S-047: Settings and Configuration

**Epic:** E-010
**Status:** Complete
**Story Points:** 3
**Description:** Settings page with GitHub sync configuration, Amazon registry URL, and informational panels.

**Acceptance Criteria:**
- [x] GitHub PAT entry and connection management
- [x] Push/pull controls with status indicators
- [x] Gist ID display and manual entry
- [x] Amazon registry URL configuration
- [x] Informational panel explaining sync

---

### S-048: Authentication Gate

**Epic:** E-010
**Status:** Complete
**Story Points:** 2
**Description:** Client-side password gate to provide a casual access barrier for the deployed app.

**Acceptance Criteria:**
- [x] Password check against environment variable
- [x] Session-based authentication (sessionStorage)
- [x] Password form with enter-to-submit
- [x] Configurable via `NEXT_PUBLIC_APP_PASSWORD`

---

### S-049: CI/CD Pipeline (Deploy Only)

**Epic:** E-010
**Status:** Complete
**Story Points:** 2
**Description:** GitHub Actions workflow for building and deploying the static export to GitHub Pages.

**Acceptance Criteria:**
- [x] Triggers on push to main and manual dispatch
- [x] Installs dependencies, builds, and deploys to GitHub Pages
- [x] Password injected via GitHub secret
- [ ] Lint step (not yet added -- see S-004)
- [ ] Test step (not yet added -- see S-004)

---

---

## E-011: Undo/Redo and Data Safety

**Priority:** P3
**Status:** Planned
**Description:** Provide undo capability for accidental deletions and a broader action history for data safety. Listed as a future enhancement in the PRD.

---

### S-050: Undo for Delete Actions

**Epic:** E-011
**Status:** Planned
**Story Points:** 5
**Description:** When a user deletes an item, note, appointment, contact, class, material, or bag item, show an "Undo" toast that allows restoring the deleted entity within a short time window.

**Acceptance Criteria:**
- Deleting any entity shows an "Undo" toast for 5 seconds
- Clicking "Undo" restores the deleted entity to its previous state
- If the toast expires without undo, the deletion is permanent
- Multiple consecutive deletes each get their own undo toast
- Undo works correctly with Gist auto-sync (restored item syncs properly)

---

### S-051: Action History Log

**Epic:** E-011
**Status:** Planned
**Story Points:** 5
**Description:** Maintain a rolling history of the last N state changes, allowing multi-step undo. Accessible from a "History" panel in Settings.

**Acceptance Criteria:**
- Last 20 state snapshots are stored (in memory, not persisted)
- History panel in Settings shows recent actions with timestamps
- Each entry describes the action (e.g., "Deleted item: Baby Monitor")
- User can revert to any previous state from the history
- History is cleared on page refresh (not persisted to avoid storage bloat)

---

---

## E-012: Internationalization

**Priority:** P3
**Status:** Planned
**Description:** Support multiple languages for non-English users. Listed as a future enhancement in the PRD.

---

### S-052: i18n Framework Setup

**Epic:** E-012
**Status:** Planned
**Story Points:** 5
**Description:** Set up an internationalization framework (e.g., `next-intl` or `react-i18next`) and extract all user-facing strings into translation files.

**Acceptance Criteria:**
- i18n library is installed and configured
- All hardcoded UI strings are extracted to translation files
- English is the default locale
- Language selector is available in Settings
- Selected language is persisted in localStorage
- Static export compatibility is maintained (no server-side locale detection)

---

### S-053: Add French Translation

**Epic:** E-012
**Status:** Planned
**Story Points:** 3
**Description:** Add French as the first non-English language to validate the i18n setup. (French chosen as a representative second language; actual languages can be prioritized based on user feedback.)

**Acceptance Criteria:**
- Complete French translation file for all UI strings
- All pages render correctly in French
- Date and number formatting respects French locale
- Checklist item names have French translations (or fall back to English)
- Language can be switched at runtime without page reload

---

---

## Priority and Roadmap Summary

### P0 -- Must Complete Before v0.2.0

| Epic | Stories | Total Points | Status |
|------|---------|-------------|--------|
| E-001: Core Infrastructure | S-001 through S-006 | 20 | In Progress |
| E-002: Data Reliability | S-007 through S-011 | 16 | Planned |
| E-010: Feature Completion | S-037 through S-049 | 62 | Complete |

### P1 -- Target for v0.2.0

| Epic | Stories | Total Points | Status |
|------|---------|-------------|--------|
| E-003: UX Polish | S-012 through S-017 | 18 | Planned |
| E-004: PWA & Offline | S-018 through S-020 | 14 | Planned |

### P2 -- Target for v0.3.0

| Epic | Stories | Total Points | Status |
|------|---------|-------------|--------|
| E-005: Import/Export | S-021 through S-025 | 18 | Planned |
| E-006: Collaboration | S-026 through S-027 | 10 | Planned |
| E-009: Performance | S-033 through S-036 | 16 | Planned |

### P3 -- Target for v1.0.0

| Epic | Stories | Total Points | Status |
|------|---------|-------------|--------|
| E-007: Notifications | S-028 through S-029 | 8 | Planned |
| E-008: Visual Enhancements | S-030 through S-032 | 18 | Planned |
| E-011: Undo/Redo | S-050 through S-051 | 10 | Planned |
| E-012: Internationalization | S-052 through S-053 | 8 | Planned |

### Total Story Points

| Category | Points |
|----------|--------|
| Complete (E-010) | 62 |
| Planned (all other epics) | 156 |
| **Grand Total** | **218** |
