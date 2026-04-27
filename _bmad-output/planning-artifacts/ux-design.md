# UX Design Document -- Operation Burrito

**Version:** 0.1.0
**Last Updated:** 2026-04-21
**Status:** Documenting current implementation + improvement recommendations

---

## 1. Design System

### 1.1 Color Palette

The app uses three custom palettes defined in `tailwind.config.ts`, plus Tailwind's built-in `stone` palette for neutrals.

#### Sage (Primary -- greens)

| Token | Hex | Usage |
|-------|-----|-------|
| `sage-50` | `#f4f7f4` | Light backgrounds, tinted cards (e.g., due date banner) |
| `sage-100` | `#e6ede6` | Active nav item background, selected filter pills |
| `sage-200` | `#cedcd0` | Borders on sage-tinted containers |
| `sage-400` | `#85a389` | Focus ring color for form inputs |
| `sage-500` | `#638668` | Icon accent on non-urgent states |
| `sage-600` | `#4d6b52` | **Primary button background**, active nav text, link text, checkbox accent |
| `sage-700` | `#3f5642` | Primary button hover, active nav text variant |

#### Blush (Accent -- pink/red)

| Token | Hex | Usage |
|-------|-----|-------|
| `blush-50` | `#fdf4f4` | Reserved for future use |
| `blush-400` | `#ec8585` | Reserved for future use |
| `blush-600` | `#cc3f3f` | Reserved for future use |

> **Note:** The `blush-*` palette is defined in the config but currently **not referenced** anywhere in the codebase. Instead, Tailwind's built-in `rose-*` is used for red/pink accents (alerts, urgency, contraction timer). Consider migrating rose usages to blush for consistency with the custom palette, or removing blush from the config if it is not needed.

#### Stone (Neutral)

| Token | Usage |
|-------|-------|
| `stone-50` | Body background (`bg-stone-50`), subtle hover states |
| `stone-100` | Card borders, progress bar tracks, section dividers |
| `stone-200` | Input borders, secondary button borders |
| `stone-300` | Inactive icons, unchecked circles |
| `stone-400` | Secondary text, labels, timestamps, helper text |
| `stone-500` | Filter labels, sidebar inactive text |
| `stone-600` | Body text in forms, hamburger icon |
| `stone-700` | Card headings, item names, sidebar hover text |
| `stone-800` | Page headings, primary body text |

#### Semantic Colors (from Tailwind built-ins)

| Color | Usage |
|-------|-------|
| `emerald-*` | Success/purchased states, GitHub connected indicator, progress bars (items) |
| `rose-*` | Urgency, alerts, 5-1-1 rule banner, contraction active state, "Must Have" badges |
| `amber-*` | Warning-level urgency, "Need to Buy" badges, "Nice to Have" badges |
| `violet-*` | Classes stat card |
| `orange-*` | Hospital bag stat card, Amazon badge |
| `blue-*` | "In My List" status badges |
| `sky-*` | Calendar/appointment icon accent |
| `purple-*` | Non-Amazon registry source badge |

### 1.2 Typography

The app uses the browser default sans-serif font stack (no custom font imports). All typography is controlled through Tailwind utility classes.

| Element | Classes | Example |
|---------|---------|---------|
| Page heading | `text-2xl font-bold text-stone-800` | "Dashboard", "Baby Items & Checklist" |
| Page subtitle | `text-sm text-stone-400 mt-1` | "Your baby prep command center." |
| Card heading | `text-sm font-semibold text-stone-700` | "Must-Have Items Still Needed" |
| Section heading (birth plan) | `text-xs font-semibold text-stone-400 uppercase tracking-wide` | "IDENTITY", "MEDICAL INFORMATION" |
| Body text | `text-sm text-stone-600` | Checkbox labels, item names |
| Helper/meta text | `text-xs text-stone-400` | Timestamps, categories, counts |
| Timer display | `text-8xl font-mono font-bold tabular-nums` | "02:34" contraction clock |
| Stat card value | `text-lg font-bold text-stone-800` | "12 / 45" |
| Form label | `text-xs font-medium text-stone-500 mb-1` (`.label` class) | "Item Name *" |

### 1.3 Spacing

| Context | Value |
|---------|-------|
| Page max width | `max-w-5xl` (most pages), `max-w-3xl` (birth plan), `max-w-2xl` (timer) |
| Page horizontal padding | `p-4` mobile, `p-8` desktop |
| Section margin bottom | `mb-6` |
| Card internal padding | `p-4` to `p-5` (standard), `p-8` (timer main card) |
| Form field spacing | `space-y-3` to `space-y-4` |
| Grid gaps | `gap-3` (stat cards), `gap-4` to `gap-5` (content grids) |
| Nav item padding | `px-3 py-2.5` |

### 1.4 Component Classes

Defined in `src/app/globals.css` via `@layer components`:

#### `.btn-primary`
```
inline-flex items-center gap-2 px-4 py-2
bg-sage-600 hover:bg-sage-700 text-white
text-sm font-medium rounded-lg transition-colors
```
Usage: Primary actions ("Add Custom", "Save", "Start Contraction", "Mark Bought")

#### `.btn-secondary`
```
inline-flex items-center gap-2 px-4 py-2
bg-white hover:bg-stone-50 text-stone-700
text-sm font-medium rounded-lg border border-stone-200 transition-colors
```
Usage: Secondary actions ("Import", "Receipt", "Registry", "Cancel")

#### `.btn-danger`
```
inline-flex items-center gap-2 px-3 py-1.5
bg-red-50 hover:bg-red-100 text-red-600
text-sm font-medium rounded-lg transition-colors
```
Usage: Destructive actions ("Clear All" on contraction timer)

#### `.card`
```
bg-white rounded-xl border border-stone-200 shadow-sm
```
Usage: Every content container -- stat cards, lists, forms, info panels

#### `.input`
```
w-full px-3 py-2 border border-stone-200 rounded-lg text-sm
focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent bg-white
```

#### `.select`
Same as `.input` but used for `<select>` elements.

#### `.textarea`
Same as `.input` plus `resize-none`.

#### `.label`
```
block text-xs font-medium text-stone-500 mb-1
```

#### `.badge`
```
inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
```
Usage: Status indicators, category tags, priority labels. Background colors applied per-context (e.g., `bg-rose-100 text-rose-700` for "Must Have").

### 1.5 Animations

| Animation | Definition | Usage |
|-----------|-----------|-------|
| `shake` | `translateX` oscillation, 0.5s ease-in-out | Defined in config; available but not currently observed in use |
| CSS transitions | `transition-colors`, `transition-shadow`, `transition-opacity`, `transition-all` | Hover effects on buttons, cards, nav items |

---

## 2. Layout Patterns

### 2.1 Root Layout Structure

```
<html lang="en">
  <body>
    <AuthGate>
      <StoreProvider>
        <div class="flex min-h-screen">
          <Sidebar />                     <!-- fixed w-64 desktop, drawer mobile -->
          <main class="flex-1 w-full md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
            {children}                    <!-- Page content -->
          </main>
        </div>
      </StoreProvider>
    </AuthGate>
  </body>
</html>
```

### 2.2 Sidebar (Desktop)

- Fixed position, left-aligned, full viewport height
- Width: `w-64` (256px)
- Background: white with right border (`border-r border-stone-200`)
- Three zones: Header (logo + app name), scrollable nav list, footer (Settings + sync status)
- Active item: `bg-sage-100 text-sage-700`
- Inactive item: `text-stone-500 hover:bg-stone-50 hover:text-stone-700`

### 2.3 Sidebar (Mobile)

- Hidden off-screen by default (`-translate-x-full`)
- Triggered by hamburger button: fixed `top-4 left-4`, white bg, rounded, bordered, shadow
- Slides in with `translate-x-0` + `transition-transform duration-200`
- Backdrop overlay: `bg-black/30` covering viewport, closes sidebar on tap
- Close button (X icon) visible inside sidebar header on mobile only
- Auto-closes on route change

### 2.4 Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Default (mobile) | < 768px | Full-width content, hamburger menu, `p-4` padding, `pb-24` bottom padding for thumb reach |
| `md:` | >= 768px | Sidebar visible, content offset by `ml-64`, `p-8` padding |
| `lg:` | >= 1024px | Grid expands (e.g., stat cards 4-column, content area split 2:1) |
| `sm:` | >= 640px | Minor grid adjustments (e.g., timer stats 4-col instead of 2-col) |

### 2.5 Main Content Area

- Centered with `max-w-*` constraint per page type
- Top padding: `pt-10` on mobile (to clear hamburger button) on dashboard; other pages rely on base `p-4`
- Bottom padding: `pb-24` on mobile to prevent content from being hidden behind mobile browser chrome

---

## 3. Page Templates

### 3.1 List View with Filters (Items, Hospital Bag, Appointments, etc.)

```
+---------------------------------------------------------------+
|  Page Title                              [Secondary] [Primary] |
|  Subtitle / stats summary                                      |
+---------------------------------------------------------------+
|  [View mode toggle]                                            |
+---------------------------------------------------------------+
|  [Filter bar: timing pills | status/category/priority selects] |
+---------------------------------------------------------------+
|  Category Group Header           progress bar   [chevron]      |
|  ---------------------------------------------------------------
|  | [icon] Item name  [badge] [badge]        $cost  [actions]  |
|  | [icon] Item name  [badge]                       [actions]  |
|  ---------------------------------------------------------------
|  Category Group Header           progress bar   [chevron]      |
|  ...                                                           |
+---------------------------------------------------------------+
```

- Items grouped by category with collapsible sections
- Per-group progress bar showing completion ratio
- Inline action buttons revealed on hover (edit, delete) or always visible (quick-add, mark bought)
- Empty state component shown when no items match filters

### 3.2 Form View (Birth Plan)

```
+---------------------------------------------------------------+
|  Page Title                              [Secondary] [Primary] |
|  Subtitle (fields filled, last updated)                        |
+---------------------------------------------------------------+
|  [Info banner -- contextual guidance]                          |
+---------------------------------------------------------------+
|  [ Tab 1 | Tab 2 | Tab 3 | Tab 4 ]   (pill-style tab bar)   |
+---------------------------------------------------------------+
|  SECTION HEADING (uppercase, small)                            |
|  +-----------------------------------------------------------+
|  | .card                                                      |
|  | Label          [input field]                               |
|  | Label          [input field]                               |
|  +-----------------------------------------------------------+
|  SECTION HEADING                                               |
|  +-----------------------------------------------------------+
|  | [x] Checkbox option                                        |
|  | [x] Checkbox option                                        |
|  | Label          [text area]                                 |
|  +-----------------------------------------------------------+
+---------------------------------------------------------------+
```

- Tab bar: `bg-stone-100 rounded-xl p-1` container, active tab `bg-white shadow-sm`
- All tabs rendered in DOM (hidden/shown), not unmounted -- enables print-all-at-once
- Auto-save on field change (no explicit save required, though Save button exists for user confidence)
- Print stylesheet shows all tabs and hides UI chrome

### 3.3 Detail/Timer View (Contraction Timer)

```
+---------------------------------------------------------------+
|  [icon] Page Title                                             |
|  Subtitle                                                      |
+---------------------------------------------------------------+
|  [5-1-1 ALERT BANNER -- conditional]                          |
+---------------------------------------------------------------+
|  +-----------------------------------------------------------+
|  |                    [phase badge]                           |
|  |                                                            |
|  |                     00:00                                  |
|  |                  (giant timer)                             |
|  |                                                            |
|  |              [ Start/Stop Button ]                         |
|  |              (hint text below)                             |
|  +-----------------------------------------------------------+
+---------------------------------------------------------------+
|  | Last Duration | Last Interval | Avg Interval | Total |    |
+---------------------------------------------------------------+
|  Recent Contractions          [last N]       [Clear All]      |
|  #  | Duration | Interval | Time                              |
|  ----------------------------------------------------------------
|  10 | 01:12    | 04:30    | 2:34:12 PM                        |
|  ...                                                           |
+---------------------------------------------------------------+
```

### 3.4 Dashboard (Composite View)

```
+---------------------------------------------------------------+
|  [Due Date Banner -- color-coded by urgency]                  |
+---------------------------------------------------------------+
|  Dashboard                                                     |
|  Your baby prep command center.                                |
+---------------------------------------------------------------+
|  [Stat Card] [Stat Card] [Stat Card] [Stat Card]             |
|  (2-col mobile, 4-col desktop, each with progress bar)        |
+---------------------------------------------------------------+
|  [Budget Strip: Estimated | Spent | Remaining]                |
+---------------------------------------------------------------+
|  +---------------------------+  +---------------------------+ |
|  | Must-Have Items (2/3 w)   |  | Upcoming Appointments     | |
|  | - item                    |  | - appt                    | |
|  | - item                    |  +---------------------------+ |
|  | - item                    |  +---------------------------+ |
|  |          View all ->      |  | Pinned Notes              | |
|  +---------------------------+  +---------------------------+ |
|                                 +---------------------------+ |
|                                 | Materials count           | |
|                                 +---------------------------+ |
|                                 +---------------------------+ |
|                                 | Amazon Registry link      | |
|                                 +---------------------------+ |
+---------------------------------------------------------------+
```

---

## 4. Navigation and Information Architecture

### 4.1 Primary Navigation (Sidebar)

The sidebar contains 12 navigation items plus Settings in the footer:

| Order | Label | Route | Icon | Domain |
|-------|-------|-------|------|--------|
| 1 | Dashboard | `/` | `LayoutDashboard` | Overview |
| 2 | Baby Items & Checklist | `/items` | `ShoppingCart` | Shopping |
| 3 | Budget | `/budget` | `PiggyBank` | Finance |
| 4 | Hospital Bag | `/hospital-bag` | `Briefcase` | Packing |
| 5 | Appointments | `/appointments` | `Calendar` | Scheduling |
| 6 | Contacts | `/contacts` | `Phone` | People |
| 7 | Classes | `/classes` | `GraduationCap` | Education |
| 8 | Materials | `/materials` | `BookOpen` | Education |
| 9 | Birth Plan | `/birth-plan` | `Heart` | Medical planning |
| 10 | Notes | `/notes` | `StickyNote` | General |
| 11 | Contraction Timer | `/timer` | `Timer` | Day-of-delivery |
| 12 | Search | `/search` | `Search` | Utility |
| -- | Settings | `/settings` | `Settings` | Configuration |

### 4.2 Navigation Grouping Analysis

The current sidebar presents all items in a flat list. Logical groups exist but are not visually separated:

- **Preparation:** Items, Budget, Hospital Bag
- **Scheduling & People:** Appointments, Contacts
- **Education:** Classes, Materials
- **Medical:** Birth Plan
- **General:** Notes, Search
- **Day-of:** Contraction Timer
- **System:** Settings

> **Recommendation:** Add subtle group separators (a thin `border-t border-stone-100` or small label) between logical groups. With 12+ items, visual chunking would reduce cognitive load, especially for first-time users.

### 4.3 Cross-Page Navigation

- Dashboard stat cards link to their respective pages (Items, Hospital Bag, Birth Plan, Classes)
- Dashboard section headers have "View all" links to full pages
- Budget strip links to `/budget`
- Registry link opens external URL
- No breadcrumbs (flat hierarchy, not needed)
- No back button (browser back is sufficient)

### 4.4 User Flow Diagram

```
First Visit:
  Dashboard (empty) --> Birth Plan (set due date) --> Items (browse checklist)
                                                   --> Hospital Bag
                                                   --> Settings (GitHub sync)

Daily Use:
  Dashboard --> Items (mark purchased) --> Budget (review spending)
           --> Appointments (check upcoming)
           --> Hospital Bag (pack items)

Day of Delivery:
  Contraction Timer (primary focus)
  --> 5-1-1 alert triggers "go to hospital"
```

---

## 5. Component Patterns

### 5.1 Cards

All content containers use the `.card` class (`bg-white rounded-xl border border-stone-200 shadow-sm`).

**Variants observed:**
- **Standard card:** `.card p-4` or `.card p-5` -- most common
- **Clickable card:** `.card` + `hover:shadow-md transition-shadow` (stat cards) or `hover:bg-stone-50` (budget strip)
- **Tinted card:** `.card` + colored background override (e.g., `bg-rose-50 border-rose-100` for birth plan info banner)
- **Collapsible card:** `.card` with clickable header that toggles child content visibility (item category groups)

### 5.2 Forms

- All inputs use the `.input` / `.select` / `.textarea` component classes
- Labels use `.label` (uppercase-ish, small, muted)
- Form layout: `space-y-4` vertical stack, occasional `grid grid-cols-2 gap-3/4` for side-by-side fields
- Checkboxes: native `<input type="checkbox">` styled with `rounded border-stone-300 text-sage-600 focus:ring-sage-400`
- Radio buttons: native `<input type="radio">` with same sage accent
- Submit row: `flex gap-3 pt-2` with primary and secondary buttons, each `flex-1 justify-center`

### 5.3 Modals

The `Modal` component (`src/components/Modal.tsx`) provides:
- Fixed overlay: `bg-black/30 backdrop-blur-sm`
- Centered white panel: `rounded-2xl shadow-xl`, max-height `90vh`, scrollable
- Three sizes: `sm` (max-w-sm), `md` (max-w-lg), `lg` (max-w-2xl)
- Header bar with title + close button (X icon)
- Content area with `px-6 py-5` padding
- Escape key dismissal
- Backdrop click dismissal

### 5.4 Filters

Two filter patterns are used:

**Pill-style toggles (timing filters):**
- Row of `badge` buttons
- Active: `bg-sage-100 text-sage-700`
- Inactive: `bg-stone-100 text-stone-500 hover:bg-stone-200`

**Dropdown selects (status, category, priority):**
- Native `<select>` elements with minimal styling
- `text-xs border border-stone-200 rounded-md px-2 py-1 bg-white`
- Placed inline in a flex row with small text labels

### 5.5 Tables and Lists

**Simple list (dashboard appointments, pinned notes):**
- `<ul>` with `space-y-2`
- Each item: `flex items-start gap-2` with icon + text block
- Text truncation via `truncate` class on narrow containers

**Data table (contraction history):**
- Grid layout: `grid grid-cols-4`
- Header row: uppercase `text-xs font-medium text-stone-400 tracking-wide`
- Data rows: `divide-y divide-stone-50`
- Conditional highlighting (e.g., `text-rose-600` for long contractions)

**Grouped list (items by category):**
- `.card` wrapper per group
- Clickable header with chevron toggle
- `divide-y divide-stone-100` for item rows within group
- Hover-reveal actions: `opacity-0 group-hover:opacity-100 transition-opacity`

### 5.6 Empty States

The `EmptyState` component provides a centered, vertical layout:
- Large emoji icon (`text-5xl`)
- Title (`text-base font-semibold text-stone-700`)
- Description (`text-sm text-stone-400`, max-width `max-w-xs`)
- Optional action button

Used when: filter results are empty, no items exist, no appointments, etc.

Alternative inline empty state: centered `<p>` with muted text (e.g., "No upcoming appointments").

### 5.7 Loading States

Minimal loading state: centered text "Loading..." in `text-stone-400 text-sm`, displayed within a `h-64` flex container. Used when `loaded` flag is false (localStorage hydration pending).

Most pages return `null` during loading (no visual feedback).

> **Recommendation:** Consider a consistent skeleton loading pattern or a branded spinner. Returning `null` causes a blank flash that can feel broken on slower devices.

### 5.8 Stat Cards (Dashboard)

Custom `StatCard` component:
- `.card p-4` container, clickable with `hover:shadow-md`
- Colored icon badge: `inline-flex p-2 rounded-lg` with tinted background
- Label, value, subtitle text stack
- Progress bar at bottom: `h-1.5 bg-stone-100 rounded-full` track, colored fill

### 5.9 Alert Banners

**Due date banner (dashboard):**
- Color-coded by urgency: `bg-sage-50` (> 6 weeks), `bg-amber-50` (2-6 weeks), `bg-rose-50` (< 2 weeks)
- `rounded-2xl p-5` with icon + text

**5-1-1 rule alert (timer):**
- `bg-rose-50 border border-rose-200 rounded-xl p-4`
- Warning icon + bold title + explanation text

**Informational banner (birth plan):**
- `bg-rose-50 border-rose-100` card with Heart icon
- Soft guidance text

---

## 6. Mobile Considerations

### 6.1 Hamburger Menu

- Fixed position: `top-4 left-4 z-40`
- Appearance: `p-2 bg-white rounded-lg border border-stone-200 shadow-sm`
- Icon: `Menu` (20px) in `text-stone-600`
- Hidden on desktop: `md:hidden`

### 6.2 Touch Targets

- Nav items: `px-3 py-2.5` -- approximately 40px tall. This is slightly below the 44px WCAG recommendation.
- Buttons (`.btn-primary`, `.btn-secondary`): `px-4 py-2` -- approximately 36-40px tall.
- Hamburger button: `p-2` + 20px icon = approximately 36px. Below the 44px target.
- Contraction timer start/stop: `px-8 py-4` -- approximately 56px tall. Excellent touch target.
- Checkbox/radio inputs: browser default size. May be small on mobile.

> **Recommendation:** Increase minimum touch target size to 44x44px for nav items, action buttons, and the hamburger menu. Consider `min-h-[44px] min-w-[44px]` utility classes.

### 6.3 Responsive Grid

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Stat cards | `grid-cols-2` | `lg:grid-cols-4` |
| Dashboard content | Single column | `lg:grid-cols-3` (2:1 split) |
| Timer stats | `grid-cols-2` | `sm:grid-cols-4` |
| Form fields | Single column | `grid-cols-2 gap-3` |
| Budget strip | 3-col always (may be tight) | 3-col with more room |
| Action buttons | `flex-wrap gap-2` | Horizontal row |

### 6.4 Mobile-Specific Adjustments

- Dashboard: `pt-10` to clear hamburger button
- Main content: `pb-24` on mobile for bottom spacing
- Sidebar auto-closes on route change
- Filter pills wrap naturally with `flex-wrap`

> **Recommendation:** The budget strip's 3-column layout on mobile can be cramped with dollar amounts. Consider stacking vertically on very small screens (`< 380px`).

---

## 7. Interaction Patterns

### 7.1 CRUD Operations

**Create:**
- "Add" button in page header opens a Modal
- Form inside modal with required field validation
- Submit closes modal and adds item to store

**Read:**
- Items displayed in grouped lists or card grids
- Detail data shown inline (no separate detail page)

**Update:**
- Edit button (pencil icon) on tracked items opens same Modal pre-filled
- Birth plan fields auto-save on change
- Toggle states: purchased/unpacked checkboxes, pin/unpin

**Delete:**
- Trash icon on individual items
- Currently **no confirmation dialog** for item deletion

> **Recommendation:** Add a confirmation step for delete operations, especially for tracked items with cost data. A simple inline "Are you sure?" or toast with undo would prevent data loss.

### 7.2 Quick Actions (Checklist Items)

Checklist items in "need" status show three inline action buttons:
- **"+ List"** (btn-secondary) -- adds to tracked items as unpurchased
- **"Bought"** (btn-primary) -- adds as purchased
- **"Have"** (btn-secondary) -- marks as already owned

These are immediate-effect actions with no confirmation.

### 7.3 Inline Editing

- Edit/delete icons appear on hover (`opacity-0 group-hover:opacity-100`)
- Birth plan fields edit in-place (no modal)
- Toggle packed/purchased status with single click

> **Recommendation:** Hover-reveal actions are invisible on touch devices. Consider always showing action buttons on mobile, or providing a swipe-to-reveal gesture, or a "..." overflow menu.

### 7.4 Confirmation Dialogs

Only one confirmation pattern exists: the contraction timer "Clear All" button:
1. User clicks "Clear All"
2. Button area transforms to show "Sure?" text + "Yes, clear" (btn-danger) + "Cancel" (btn-secondary)
3. No modal overlay -- inline confirmation

> **Recommendation:** Extend this inline confirmation pattern to other destructive actions (delete item, disconnect GitHub sync in settings). It is lightweight and does not interrupt flow.

### 7.5 Toast/Feedback Notifications

Birth plan Save button shows inline feedback:
- Text changes from "Save" to "Saved!" with checkmark icon
- Reverts after 2 seconds via `setTimeout`
- No toast component or notification system exists

> **Recommendation:** Implement a lightweight toast notification system for: successful imports, sync push/pull completion, item deletion (with undo), and error states. A simple fixed-bottom-right toast with auto-dismiss would cover most cases.

---

## 8. Accessibility

### 8.1 Current Implementation

**Semantic HTML:**
- `<html lang="en">` is set
- `<nav>` wraps the navigation list
- `<main>` wraps page content
- `<aside>` wraps the sidebar
- `<h1>` used for page titles (one per page)
- `<h2>` used for section headings within pages
- `<form>` with `onSubmit` for data entry
- `<label>` elements used for form fields (via `.label` class and explicit `<label>` wrapping)
- `<button>` used for all interactive controls (not `<div onClick>`)

**Keyboard Support:**
- Modal dismisses on Escape key
- Native form elements are keyboard-navigable
- Link-based navigation works with keyboard
- Tab order follows DOM order (logical)

### 8.2 Gaps and Recommendations

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Mobile overlay close has no keyboard trap | Medium | Add focus trap inside open sidebar/modal to prevent tabbing to background content |
| No `aria-label` on icon-only buttons | Medium | Add `aria-label` to hamburger button, close button, edit/delete icon buttons |
| No `aria-expanded` on collapsible sections | Low | Add `aria-expanded` to category group toggle buttons |
| No `aria-live` for dynamic content | Medium | Add `aria-live="polite"` to: "Saved!" feedback, 5-1-1 alert, timer display |
| No skip-to-content link | Low | Add a visually-hidden "Skip to main content" link as first focusable element |
| Checkbox/radio without visible focus ring in some contexts | Low | Verify `focus:ring-sage-400` renders on all checkbox/radio elements |
| Color-only status differentiation | Medium | Status badges use color + text ("need", "in list", "have"), which is good. Contraction highlighting relies partially on color alone -- add icon or text label |
| Touch targets below 44px | Medium | See Section 6.2 |

### 8.3 Color Contrast

The primary concern areas:

| Combination | Approx Ratio | WCAG AA (4.5:1 for small text) |
|-------------|-------------|-------------------------------|
| `text-stone-400` on `bg-white` | ~4.5:1 | Borderline pass for small text |
| `text-stone-500` on `bg-white` | ~5.5:1 | Pass |
| `text-sage-600` on `bg-white` | ~5.0:1 | Pass |
| `text-sage-700` on `bg-sage-100` | ~5.2:1 | Pass |
| `text-stone-300` on `bg-white` | ~3.0:1 | **Fail** for text; acceptable for decorative icons only |
| `text-xs text-stone-400` (helper text) | ~4.5:1 | Borderline; bump to `stone-500` for safer compliance |

> **Recommendation:** Audit all `text-stone-300` and `text-stone-400` usages that convey meaningful information (not just decoration). Consider upgrading to `text-stone-500` for any text that must be read.

### 8.4 Print Stylesheet

The app includes a print stylesheet in `globals.css` for the Birth Plan page:
- Hides sidebar, buttons, and UI chrome
- Shows all tab panels simultaneously
- Removes shadows, simplifies borders
- Adds section titles as print-only headers
- Avoids page breaks inside cards

---

## 9. Key Screen Wireframes

### 9.1 Dashboard

```
+============================================================+
| [hamburger]          (mobile only)                          |
+============================================================+
|                                                             |
|  +------------------------------------------------------+  |
|  | [baby icon]  6w 3d until due date                     |  |
|  |              Saturday, June 6, 2026                   |  |
|  +------------------------------------------------------+  |
|                                                             |
|  Dashboard                                                  |
|  Your baby prep command center.                             |
|                                                             |
|  +------------+ +------------+ +------------+ +----------+ |
|  | [cart]     | | [bag]      | | [heart]    | | [grad]   | |
|  | Items      | | Bag Packed | | Birth Plan | | Classes  | |
|  | 24 / 89    | | 8 / 32    | | 12 / 20   | | 2 / 5   | |
|  | 27% done   | | 25% packed | | fields    | | 3 left  | |
|  | [=====   ] | | [===     ] | | [======  ]| | [====  ]| |
|  +------------+ +------------+ +------------+ +----------+ |
|                                                             |
|  +------------------------------------------------------+  |
|  | Estimated Total  |  Spent So Far   |  Still Needed    |  |
|  |    $4,230        |    $1,890       |    $2,340        |  |
|  +------------------------------------------------------+  |
|                                                             |
|  +----------------------------------+ +------------------+ |
|  | Must-Have Items Still Needed      | | Upcoming Appts   | |
|  |                       View all -> | |       View all ->| |
|  | o  Convertible car seat  $350     | | [cal] Ultrasound | |
|  | o  Crib mattress         $180     | |   May 15 at 2pm  | |
|  | o  Baby monitor          $200     | | [cal] OB Visit   | |
|  | o  Stroller              $450     | |   May 22 at 10am | |
|  | o  Diaper bag            $80      | +------------------+ |
|  |         +2 more                   | +------------------+ |
|  +----------------------------------+ | Pinned Notes      | |
|                                       |       View all -> | |
|                                       | [note] Pack snack | |
|                                       +------------------+ |
|                                       +------------------+ |
|                                       | Materials    12   | |
|                                       | saved resources   | |
|                                       +------------------+ |
+============================================================+
```

### 9.2 Items List

```
+============================================================+
|  Baby Items & Checklist               [Import] [+ Add Custom]|
|  145 checklist . 38 matched . 6 unique . 52 need . 12 list  |
+============================================================+
|  View: [ All 145 Items ]  [ My Tracked Items (48) ]         |
+--------------------------------------------------------------+
|  [clock] When needed: [All] [Pregnancy] [Hospital] [0-3mo]  |
|                        [1-6mo] [Special] [Other]             |
|  [filter] Status [All v]  Category [All v]  Priority [All v]|
+--------------------------------------------------------------+
|  +----------------------------------------------------------+|
|  | Nursery         2 need  1 in list  4 have  [====] 4/7 v  ||
|  |----------------------------------------------------------||
|  | [check] Crib           [Must Have]  [Have it]  $250      ||
|  | [check] Crib Mattress  [Must Have]  [Amazon]   $150      ||
|  | [o---] Change Pad                [+ List] [Bought] [Have]||
|  | [o---] Dresser                   [+ List] [Bought] [Have]||
|  | [blue] Baby Monitor    [Must Have]  [In list]    $200    ||
|  +----------------------------------------------------------+|
|  +----------------------------------------------------------+|
|  | Clothing       0 need  3 in list  8 have  [======] 8/11 ^||
|  +----------------------------------------------------------+|
|  +----------------------------------------------------------+|
|  | Feeding        5 need  0 in list  2 have  [==]    2/7  v ||
|  |----------------------------------------------------------||
|  | ...                                                       ||
|  +----------------------------------------------------------+|
+--------------------------------------------------------------+
```

### 9.3 Birth Plan Form

```
+============================================================+
|  Birth Plan                          [Save as PDF] [Save]   |
|  12 fields filled . Last updated Apr 20                      |
+============================================================+
|  +----------------------------------------------------------+
|  | [heart] Based on the BC Women's Hospital Labour & Birth   |
|  |         Guide. Fill in as much or as little as you like.  |
|  +----------------------------------------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  | [Personal Info] [Labour & Birth] [After Birth] [Interv.]  |
|  +----------------------------------------------------------+
|                                                              |
|  IDENTITY                                                    |
|  +----------------------------------------------------------+
|  |  Legal Name          [____________________]               |
|  |  Preferred Name      [____________________]               |
|  |                                                           |
|  |  Due Date            [____/____/________]                 |
|  +----------------------------------------------------------+
|                                                              |
|  MEDICAL INFORMATION                                         |
|  +----------------------------------------------------------+
|  |  Current Medications                                      |
|  |  [                                          ]             |
|  |  [__________________________________________]             |
|  |                                                           |
|  |  Allergies                                                |
|  |  [                                          ]             |
|  |  [__________________________________________]             |
|  +----------------------------------------------------------+
|                                                              |
|  Notes                                                       |
|  [                                              ]            |
|  [______________________________________________]            |
+============================================================+
```

### 9.4 Contraction Timer

```
+============================================================+
|  [activity] Contraction Timer                                |
|  Track the frequency and duration of contractions            |
+============================================================+
|                                                              |
|  +----------------------------------------------------------+
|  | [!] 5-1-1 Rule Active                                    |
|  |     Contractions are 5 minutes apart or less, lasting     |
|  |     1 minute or more, for over an hour. Time to call      |
|  |     your provider or head to the hospital.                |
|  +----------------------------------------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  |                                                           |
|  |              [ Contraction in progress ]                  |
|  |                                                           |
|  |                    01:23                                   |
|  |              (very large, red when active)                |
|  |                                                           |
|  |           [  Stop Contraction  ]                          |
|  |                                                           |
|  +----------------------------------------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  | Last Duration | Last Interval | Avg Interval | Total     |
|  |    01:12      |    04:30      |    05:15     |   8       |
|  +----------------------------------------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  | Recent Contractions  [last 8]         [Clear All]        |
|  |----------------------------------------------------------+
|  | #   Duration   Interval   Time                           |
|  | 8   01:12      04:30      2:34:12 PM                     |
|  | 7   00:58      05:15      2:29:42 PM                     |
|  | 6   01:05      04:45      2:24:27 PM                     |
|  | 5   01:20      05:00      2:19:27 PM                     |
|  | ...                                                      |
|  +----------------------------------------------------------+
+============================================================+
```

---

## 10. Design Improvement Summary

### High Priority

| # | Issue | Current State | Recommendation |
|---|-------|---------------|----------------|
| 1 | Hover-only actions invisible on touch | Edit/delete icons use `group-hover:opacity-100` | Always show on mobile, or use overflow menu |
| 2 | No delete confirmation | Items deleted immediately on click | Add inline confirmation or undo toast |
| 3 | Touch targets undersized | Nav items ~40px, hamburger ~36px | Ensure minimum 44x44px on all interactive elements |
| 4 | No toast/notification system | Only birth plan has "Saved!" feedback | Add global toast for CRUD feedback, sync status, errors |
| 5 | Missing aria labels on icon buttons | Hamburger, close, edit, delete lack aria-label | Add descriptive aria-label to all icon-only buttons |

### Medium Priority

| # | Issue | Current State | Recommendation |
|---|-------|---------------|----------------|
| 6 | Flat sidebar with 13 items | All nav items in single list | Add visual group separators for related features |
| 7 | Inconsistent loading states | Some pages show "Loading...", others return null | Standardize on skeleton or spinner pattern |
| 8 | blush palette unused | Defined in config, never referenced | Either adopt blush in place of rose or remove from config |
| 9 | No focus trap in modals/sidebar | Tab can escape to background content | Implement focus trap for open overlay components |
| 10 | Color-borderline contrast | `text-stone-400` at ~4.5:1 used for meaningful text | Upgrade to `stone-500` where text must be read |

### Low Priority

| # | Issue | Current State | Recommendation |
|---|-------|---------------|----------------|
| 11 | No skip-to-content link | Missing entirely | Add visually-hidden skip link |
| 12 | No dark mode | Light only | Add theme toggle (mentioned in PRD future enhancements) |
| 13 | Budget strip cramped on mobile | 3-column always | Stack vertically on screens < 380px |
| 14 | No aria-expanded on collapsibles | Category group toggles lack ARIA state | Add `aria-expanded` to toggle buttons |
| 15 | shake animation unused | Defined in tailwind config, not referenced | Remove if not planned, or use for form validation errors |
