# Development Guide — Operation Burrito

## Prerequisites

- Node.js (LTS recommended)
- npm

## Getting Started

```bash
git clone <repo-url>
cd Operation-burrito
npm install
npm run dev
```

App runs at `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build static export (output to `out/`) |
| `npm run start` | Serve production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── app/           # Pages (App Router)
├── components/    # Shared components
├── contexts/      # React contexts (StoreContext)
├── lib/           # Utility modules
└── types/         # TypeScript interfaces (single barrel)
```

## Key Conventions

### Pages
- Every page must use `"use client"` directive (static export requirement)
- Pages live at `src/app/{feature}/page.tsx`
- Import path alias: `@/*` → `./src/*`

### React Hooks
- `useMemo` and `useCallback` MUST be placed before any early `return` statements
- This was a real bug fixed in commit 7e72c84 — violating this causes React Rules of Hooks errors

### Styling
- Use Tailwind CSS utility classes
- Custom component classes available: `.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.label`, `.select`, `.textarea`, `.badge`
- Color palettes: `sage-*` (primary green), `blush-*` (accent pink), `stone-*` (neutral)
- Primary active color: `sage-600` / `sage-100` background

### Data
- All state flows through `StoreContext`
- CRUD operations update localStorage automatically
- Never use server-side data fetching or API routes

### Adding a New Feature Page
1. Create `src/app/{feature}/page.tsx` with `"use client"`
2. Add types to `src/types/index.ts`
3. Add the new data array/object to the `AppStore` interface
4. Update `StoreContext` to handle the new data
5. Add navigation entry in `Sidebar.tsx` NAV_ITEMS array
6. All hooks before any early returns

## Deployment

Deployed automatically to GitHub Pages on push. The build uses:
- `output: "export"` for static HTML
- `basePath: "/Operation-burrito"` in production
- `images.unoptimized: true`

## Data Sync

Optional GitHub Gist sync:
1. User provides a GitHub PAT with `gist` scope
2. App creates a private Gist with `operation-burrito.json`
3. Manual push/pull via Settings page
