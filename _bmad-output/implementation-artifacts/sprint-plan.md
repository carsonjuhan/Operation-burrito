# Sprint Plan -- Operation Burrito

**Created:** 2026-04-21
**Total Planned Points:** 156
**Sprints:** 8
**Velocity Target:** ~20 points per sprint

---

## Timeline Summary

| Sprint | Name | Points | Epics Covered | Status |
|--------|------|--------|---------------|--------|
| 1 | Foundation & Quality Gates | 20 | E-001, E-002, E-003 | Complete |
| 2 | Test Coverage & Data Reliability | 21 | E-001, E-002, E-003 | Complete |
| 3 | Sync Safety, Accessibility & PWA Foundation | 21 | E-002, E-003, E-004 | Complete |
| 4 | PWA Completion & Export Features | 21 | E-004, E-005 | Complete |
| 5 | Performance & Sharing (Part 1) | 19 | E-005, E-006, E-009 | Complete |
| 6 | Sharing, Performance & Dark Mode | 20 | E-006, E-008, E-009 | Complete |
| 7 | Photos, Undo & Notifications (Part 1) | 18 | E-007, E-008, E-011 | Complete |
| 8 | Milestones, History & Internationalization | 16 | E-007, E-011, E-012 | Complete |

**Total: 156 points across 8 sprints**

---

## Sprint 1 -- Foundation & Quality Gates (20 pts) -- COMPLETE

**Goal:** Establish testing infrastructure, CI/CD quality gates, error boundaries, and core UX infrastructure (loading states, empty states, toast notifications).

**Completion Notes:**
- All 156 tests passing
- Fixed build error by setting tsconfig target to es2017
- Created .eslintrc.json for lint configuration

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-001 | Add Testing Framework and Configuration | E-001 | 3 |
| S-004 | Add Lint and Test Steps to CI Pipeline | E-001 | 2 |
| S-005 | Add React Error Boundaries | E-001 | 3 |
| S-006 | Add localStorage Size Monitoring | E-001 | 2 |
| S-009 | JSON Data Export | E-002 | 2 |
| S-012 | Consistent Loading States Across All Pages | E-003 | 3 |
| S-013 | Enhanced Empty States | E-003 | 2 |
| S-017 | Toast Notification System | E-003 | 3 |

**Dependencies:**
- S-004 (CI pipeline) depends on S-001 (test framework) -- implement S-001 first within the sprint
- S-017 (toasts) is foundational for later stories that surface notifications (S-011 sync errors, S-050 undo)

**Rationale:** This sprint front-loads the P0 infrastructure that every subsequent sprint benefits from: a working test runner, CI gates to prevent regressions, error boundaries for resilience, and the UX primitives (skeletons, empty states, toasts) used throughout the app.

---

## Sprint 2 -- Test Coverage & Data Reliability (21 pts) -- COMPLETE

**Goal:** Achieve comprehensive test coverage for utilities and critical flows, and improve data reliability for sync operations.

**Completion Notes:**
- All 232 tests passing across 16 test files
- Toast notification system wired to sync and import/export flows
- Sync error handling with retry and failure detection
- Page transition animations with reduced-motion support

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-002 | Unit Tests for Utility Libraries | E-001 | 5 |
| S-003 | Component Tests for Critical Flows | E-001 | 5 |
| S-007 | Data Validation on Sync Pull | E-002 | 3 |
| S-010 | JSON Data Import | E-002 | 3 |
| S-011 | Auto-Sync Error Handling and Retry | E-002 | 3 |
| S-016 | Page Transition Animations | E-003 | 2 |

**Dependencies:**
- S-002 and S-003 depend on S-001 (test framework from Sprint 1)
- S-010 (JSON import) reuses the validation logic from S-007 -- implement S-007 first
- S-011 (sync error handling) uses the toast system from S-017 (Sprint 1)

**Rationale:** With the test framework in place, this sprint builds out the safety net of tests while simultaneously addressing the data reliability gaps in sync. Completing E-001 and most of E-002 by end of Sprint 2 closes all P0 gaps.

---

## Sprint 3 -- Sync Safety, Accessibility & PWA Foundation (21 pts) -- COMPLETE

**Goal:** Complete sync conflict detection, run accessibility audit with fixes, and begin PWA with service worker implementation.

**Completion Notes:**
- 294 tests passing across 19 test files
- Sync conflict detection with divergence confirmation dialogs
- Comprehensive accessibility fixes for WCAG AA compliance
- Keyboard shortcuts with help overlay
- Service worker with offline caching strategy

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-008 | Conflict Detection for Sync | E-002 | 5 |
| S-014 | Accessibility Audit and Fixes | E-003 | 5 |
| S-015 | Keyboard Shortcuts | E-003 | 3 |
| S-018 | Service Worker and Caching Strategy | E-004 | 8 |

**Dependencies:**
- S-008 depends on S-007 (data validation from Sprint 2) for the sync infrastructure
- S-018 (service worker) is the foundation for S-019, S-020, and later notification stories (S-028, S-029)

**Rationale:** This sprint closes E-002 (data reliability) completely with conflict detection, addresses WCAG 2.1 AA compliance from the PRD, and begins the significant PWA effort. The 8-point service worker story is the critical path for offline support.

---

## Sprint 4 -- PWA Completion & Export Features (21 pts) -- COMPLETE

**Goal:** Complete PWA with install prompt and offline indicator, implement birth plan PDF export, CSV export, and print features.

**Completion Notes:**
- 333 tests passing across 24 test files
- PWA complete with manifest, install banner, offline indicator
- Birth plan PDF export, CSV export, printable hospital bag, local PDF worker

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-019 | Web App Manifest and Install Prompt | E-004 | 3 |
| S-020 | Offline Indicator and Sync Queue | E-004 | 3 |
| S-021 | Birth Plan PDF Export | E-005 | 8 |
| S-022 | CSV Export for Baby Items | E-005 | 3 |
| S-023 | Printable Hospital Bag Checklist | E-005 | 2 |
| S-025 | Bundle pdfjs-dist Worker Locally | E-005 | 2 |

**Dependencies:**
- S-019 and S-020 depend on S-018 (service worker from Sprint 3)
- S-025 (local PDF worker) improves offline PDF parsing, complementing the PWA work

**Rationale:** Completes E-004 (PWA) and tackles the high-value export features. Birth plan PDF export was flagged as high priority in the PRD's future enhancements. Bundling the PDF worker locally aligns with the offline-first theme.

---

## Sprint 5 -- Performance & Sharing (Part 1) (19 pts) -- COMPLETE

**Completion Notes:**
- 342 tests passing across 25 test files
- Store split into 10 domain-specific contexts with memoized values
- Receipt scanner UX with progress bar and editable table
- Shareable birth plan via URL hash encoding
- List virtualization with useShowMore pagination

**Goal:** Optimize store context performance, improve receipt scanner UX, implement shareable birth plan link, and add list virtualization.

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-033 | Split Store Context by Domain | E-009 | 8 |
| S-024 | Improve Receipt Scanner UX | E-005 | 3 |
| S-026 | Shareable Read-Only Birth Plan Link | E-006 | 5 |
| S-034 | List Virtualization for Large Collections | E-009 | 3 |

**Dependencies:**
- S-033 (store split) is architecturally significant -- all subsequent store-dependent work must verify compatibility
- S-034 (virtualization) benefits from the performance baseline established by S-033

**Rationale:** The 8-point store context split is the most impactful performance optimization. Pairing it with list virtualization addresses both the re-render and rendering performance gaps identified in the architecture doc. The receipt scanner UX improvement closes E-005.

---

## Sprint 6 -- Sharing, Performance & Dark Mode (20 pts) -- COMPLETE

**Completion Notes:**
- 391 tests passing across 29 test files
- Shareable registry/checklist view via URL hash encoding
- Lazy-loaded checklist data with module-level caching hook
- useMemo audit across 5 pages (dashboard, items, classes, notes, timer)
- Full dark mode with FOUC prevention, theme toggle, dark variants on all components
- Due date milestone timeline on dashboard with responsive layout

**Goal:** Complete sharing features, finish performance optimizations, and implement dark mode and milestone timeline.

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-027 | Shareable Registry/Checklist View | E-006 | 5 |
| S-035 | Lazy-Load Checklist and Registry Reference Data | E-009 | 3 |
| S-036 | Consistent useMemo for Expensive Computations | E-009 | 2 |
| S-030 | Dark Mode | E-008 | 5 |
| S-031 | Due Date Milestone Timeline | E-008 | 5 |

**Dependencies:**
- S-035 and S-036 should follow S-033 (store split from Sprint 5) for accurate performance measurement
- S-031 (timeline) is complementary to S-029 (milestone notifications in Sprint 8)

**Rationale:** Closes E-006 (collaboration), E-009 (performance), and begins E-008 (visual enhancements). Dark mode is a highly visible improvement that benefits from all the component work completed in earlier sprints.

---

## Sprint 7 -- Photos, Undo & Notifications (Part 1) (18 pts) -- COMPLETE

**Completion Notes:**
- 438 tests passing across 32 test files
- Photo attachments with client-side resize (800px max, JPEG 0.7), thumbnails in list views, full-size modal viewer
- Undo for delete across all 7 entity types with 5-second timer and toast action button
- Appointment reminder notifications with browser Notification API, 5-min polling, day-before/morning-of reminders

**Goal:** Add photo attachments for items and notes, implement undo for delete actions, and begin appointment reminder notifications.

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-032 | Photo Attachments for Items and Notes | E-008 | 8 |
| S-050 | Undo for Delete Actions | E-011 | 5 |
| S-028 | Appointment Reminder Notifications | E-007 | 5 |

**Dependencies:**
- S-050 (undo) uses the toast system from S-017 (Sprint 1)
- S-028 (notifications) depends on S-018 (service worker from Sprint 3) for background notifications
- S-032 (photos) interacts with S-006 (localStorage monitoring from Sprint 1) for storage warnings

**Rationale:** Photo attachments are the largest remaining visual enhancement. Undo for deletes is a significant data safety improvement that pairs well with the toast infrastructure. Appointment notifications leverage the service worker established earlier.

---

## Sprint 8 -- Milestones, History & Internationalization (16 pts) -- COMPLETE

**Completion Notes:**
- 505 tests passing across 36 test files
- Milestone countdown notifications (12/8/4/2/1 weeks + due date) integrated into reminder polling
- Action history with 20-entry circular buffer, revert-to-state, and settings UI
- i18n framework with 272 English keys, complete French translation, lazy-loaded locale files
- Language selector in settings (auto-shows when >1 locale available)

**Goal:** Complete notification milestones, implement action history, and set up internationalization with first translation.

| Story | Title | Epic | Pts |
|-------|-------|------|-----|
| S-029 | Due Date Countdown Milestones | E-007 | 3 |
| S-051 | Action History Log | E-011 | 5 |
| S-052 | i18n Framework Setup | E-012 | 5 |
| S-053 | Add French Translation | E-012 | 3 |

**Dependencies:**
- S-029 depends on S-018 (service worker) for background milestone notifications
- S-053 depends on S-052 (i18n framework) -- implement sequentially within the sprint
- S-051 builds on the undo pattern established in S-050 (Sprint 7)

**Rationale:** The final sprint wraps up the remaining P3 features. Internationalization is placed last because it touches every page -- doing it after all other UI work is complete minimizes rework. The lighter 16-point load accounts for the cross-cutting nature of i18n string extraction.

---

## Epic Completion by Sprint

| Epic | Description | Priority | Starts | Completes |
|------|-------------|----------|--------|-----------|
| E-001 | Core Infrastructure and Quality | P0 | Sprint 1 | Sprint 2 |
| E-002 | Data Reliability and Sync | P0 | Sprint 1 | Sprint 3 |
| E-003 | UX Polish and Accessibility | P1 | Sprint 1 | Sprint 3 |
| E-004 | PWA and Offline Support | P1 | Sprint 3 | Sprint 4 |
| E-005 | Import, Export, and Print | P2 | Sprint 4 | Sprint 5 |
| E-006 | Collaboration and Sharing | P2 | Sprint 5 | Sprint 6 |
| E-009 | Performance Optimization | P2 | Sprint 5 | Sprint 6 |
| E-007 | Notifications and Reminders | P3 | Sprint 7 | Sprint 8 |
| E-008 | Visual Enhancements and Theming | P3 | Sprint 6 | Sprint 7 |
| E-011 | Undo/Redo and Data Safety | P3 | Sprint 7 | Sprint 8 |
| E-012 | Internationalization | P3 | Sprint 8 | Sprint 8 |

---

## Key Dependency Chain

```
S-001 (Test Framework)
  |-> S-002 (Utility Tests)
  |-> S-003 (Component Tests)
  |-> S-004 (CI Pipeline)

S-007 (Sync Validation)
  |-> S-008 (Conflict Detection)
  |-> S-010 (JSON Import)

S-017 (Toast System)
  |-> S-011 (Sync Error Handling)
  |-> S-050 (Undo for Deletes)

S-018 (Service Worker)
  |-> S-019 (Web App Manifest)
  |-> S-020 (Offline Indicator)
  |-> S-028 (Appointment Notifications)
  |-> S-029 (Due Date Milestones)

S-052 (i18n Framework)
  |-> S-053 (French Translation)
```

---

## Release Milestones

| Version | After Sprint | Content |
|---------|-------------|---------|
| v0.2.0 | Sprint 4 | P0 + P1 complete: testing, CI, error boundaries, data reliability, UX polish, accessibility, full PWA with offline support |
| v0.3.0 | Sprint 6 | P2 complete: export/import enhancements, collaboration sharing, performance optimizations, dark mode |
| v1.0.0 | Sprint 8 | All planned work complete: notifications, photo attachments, undo/redo, internationalization |
