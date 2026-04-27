# Product Brief — Operation Burrito

## Product Overview

**Operation Burrito** is a comprehensive baby preparation management app that helps expecting parents organize, track, and manage everything they need before their baby arrives — from shopping lists and budgets to birth plans and hospital bags.

## Problem Statement

Expecting parents face an overwhelming number of preparation tasks spread across multiple tools, spreadsheets, and mental notes:
- **What to buy**: Dozens of item categories with varying priorities and timelines
- **Budget tracking**: Estimated vs. actual costs across many purchases
- **Medical preparation**: Birth plans, appointments, important contacts, classes
- **Hospital readiness**: Packing lists, contraction timing, key documents
- **Information overload**: Educational materials, doctor questions, notes scattered everywhere

No single tool addresses all of these needs in a unified, simple experience.

## Target Users

### Primary: Expecting Parents
- First-time parents who don't know what they need
- Experienced parents tracking prep for another child
- Partners who want to coordinate and stay informed

### Secondary
- Baby shower organizers who need registry/item visibility
- Support people (doulas, family) who need access to birth plans or contact info

## Core Value Proposition

**One app to manage your entire baby preparation journey** — from the moment you start planning through delivery day. No accounts required, your data stays on your device, with optional sync across devices via GitHub.

## Key Features

### Implemented (v0.1.0)

| Feature | Description |
|---------|------------|
| **Dashboard** | At-a-glance overview of preparation progress |
| **Baby Items & Checklist** | Track items to buy with category, priority, timing, and cost |
| **Checklist Data** | Pre-built checklist metadata from curated sources |
| **Inventory Matching** | Match owned items against checklist recommendations |
| **Budget Tracking** | Estimated vs. actual cost analytics |
| **Hospital Bag** | Categorized packing checklist with packed/unpacked status |
| **Birth Plan** | Comprehensive birth plan builder (personal info, labour preferences, interventions, afterbirth) |
| **Appointments** | Schedule and track medical appointments |
| **Contacts** | Store important contacts (doctors, midwives, hospital, family) |
| **Classes** | Track prenatal/parenting classes |
| **Materials** | Save educational resources (PDFs, videos, articles, books) |
| **Notes** | General notes with categories (appointments, milestones, questions for doctor, etc.) |
| **Contraction Timer** | Time contractions with duration and interval tracking |
| **Global Search** | Search across all data types |
| **CSV/Sheets Import** | Import data from CSV files and Google Sheets |
| **Amazon Registry Import** | Import items from Amazon baby registry |
| **Receipt Scanning** | OCR and PDF parsing for receipt data capture |
| **File Import** | Import receipts, calendar events, contacts, and email data |
| **GitHub Gist Sync** | Cross-device data persistence via GitHub PAT + private Gist |
| **Settings** | Configure sync, manage data |

### Potential Future Enhancements
- Collaborative sharing (partner/family access without GitHub)
- Push notifications for appointment reminders
- Due date countdown and milestone timeline
- Photo/image attachments for items and notes
- Export to PDF for birth plan printing
- Progressive Web App (PWA) for offline mobile experience

## Technical Approach

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Hosting** | GitHub Pages (static export) | Free, no backend needed, simple deployment |
| **Framework** | Next.js 14 App Router | Modern React with file-based routing |
| **Data storage** | localStorage | Zero-config, instant, no accounts |
| **Cross-device sync** | GitHub Gist (optional) | Free, API-based, user-controlled |
| **Styling** | Tailwind CSS with custom palettes | Rapid development, consistent design |
| **Receipt parsing** | tesseract.js + pdfjs-dist | Client-side OCR, no server costs |

### Architecture Principles
- **Client-only**: No server-side data fetching, all pages use `"use client"`
- **Privacy-first**: Data stays on device by default; sync is opt-in and user-controlled
- **Zero cost**: No backend infrastructure, no database, no auth service
- **Offline capable**: Works without internet (except Gist sync)

## Success Metrics

| Metric | Target |
|--------|--------|
| Feature completeness | All major baby prep workflows covered |
| Data reliability | Zero data loss with localStorage + Gist backup |
| Load time | < 2s initial load on mobile |
| Mobile usability | Fully responsive, touch-friendly on all screens |

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| localStorage limits (~5-10MB) | Low | Data is text-only, unlikely to exceed; Gist sync as overflow |
| Browser data clearing | Medium | GitHub Gist sync preserves data; warn users to enable sync |
| GitHub PAT security | Medium | Stored in localStorage only; educate on token scoping |
| No real-time collaboration | Low | Single-user primary use case; future enhancement if needed |
| Static export constraints | Low | App is inherently client-side; no server features needed |

## Project Timeline

- **v0.1.0** (current): Core features implemented — items, budget, hospital bag, birth plan, appointments, contacts, classes, materials, notes, timer, search, import, sync
- **v0.2.0** (next): Polish, bug fixes, UX refinements, PWA support
- **v1.0.0** (future): Feature-complete with export capabilities and sharing
