# Operation Burrito — Project Overview

## What Is It?

Operation Burrito is a baby preparation management app built for expecting parents. It provides a single place to track everything needed before a baby arrives — shopping lists, budgets, hospital bags, birth plans, appointments, and more.

## Tech Stack

- **Next.js 14.2.5** (App Router, static export)
- **React 18** with TypeScript (strict mode)
- **Tailwind CSS 3.4** with custom `sage`/`blush` color palettes
- **lucide-react** for icons, **clsx** for class utilities
- **pdfjs-dist** + **tesseract.js** for client-side receipt scanning
- Deployed to **GitHub Pages** as a fully static site

## Key Features

| Feature | Page | Description |
|---------|------|-------------|
| Dashboard | `/` | Overview of preparation progress |
| Baby Items & Checklist | `/items` | Item tracking with categories, priorities, timing, costs |
| Budget | `/budget` | Cost analytics (estimated vs. actual) |
| Hospital Bag | `/hospital-bag` | Categorized packing checklist |
| Birth Plan | `/birth-plan` | Comprehensive birth plan builder |
| Appointments | `/appointments` | Medical appointment scheduling |
| Contacts | `/contacts` | Important contacts directory |
| Classes | `/classes` | Prenatal/parenting class tracker |
| Materials | `/materials` | Educational resource library |
| Notes | `/notes` | Categorized notes |
| Contraction Timer | `/timer` | Contraction duration/interval tracking |
| Search | `/search` | Global search across all data |
| Settings | `/settings` | Sync config and data management |

## Architecture Highlights

- **Client-only**: All pages use `"use client"` — no server-side data fetching
- **localStorage persistence**: Single `AppStore` in React Context, persisted to localStorage
- **GitHub Gist sync**: Optional cross-device persistence via GitHub PAT + private Gist
- **Privacy-first**: Data stays on device by default; no accounts required
- **Import capabilities**: CSV, Google Sheets, Amazon registry, receipt OCR/PDF, file import

## How to Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # Static export to out/
npm run lint    # ESLint
```
