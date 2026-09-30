# Freelance Workbook

## Quick overview (all WIP)

- Free, open-source, offline
- Available for macOS and Windows
- Task boards, time tracking, knowledge base, links and more 

## Description

Local workspace for freelance projects. Data lives in two JSON files at the repo root; `server.cjs` serves the React UI and API.

```bash
npm install
npm run build
npm start
# → http://localhost:3456
```

Dev (Vite HMR + API on :3456):

```bash
npm start          # API + static (build first)
npm run dev        # Vite on :5173, proxies /api → :3456
```

## Storage

| File | Role |
|------|------|
| [`seedWorkspace.json`](seedWorkspace.json) | Read-only seed for a fresh start. The app never writes this file. |
| [`userWorkspace.json`](userWorkspace.json) | Live workspace. All edits are saved here. |

On startup, if `userWorkspace.json` is missing, empty, or corrupt/invalid, the server deep-clones `seedWorkspace.json` into a new `userWorkspace.json`.

Restore the demo: Settings → Data → **Reset to seed workspace**, or delete `userWorkspace.json` and restart `npm start`.

## Demo data (`isDemo`)

The seed is sample freelancer work. Every **project**, **task board**, and **task card** in `seedWorkspace.json` is marked:

```json
"isDemo": true
```

- Not shown in the UI.
- Exposed on the API (`project.isDemo`, `board.isDemo`, `card.isDemo`) so a future “Remove demo data” control can delete only flagged items and leave user-created work alone.
- User-created projects / boards / cards omit `isDemo`. Writes preserve an existing `isDemo: true` when editing demo entities so saves don’t strip the flag.

### Planned UX (not implemented yet)

New users start from this demo state. A button should:

1. Delete all projects with `isDemo: true` (and their boards/cards), **or** delete only boards/cards flagged `isDemo` inside mixed projects if that model is preferred later.
2. Leave anything without `isDemo` untouched.

Until that exists, restore via Settings → Data → **Reset to seed workspace**, or by deleting `userWorkspace.json` (see above).

## Seed snapshot (revert target)

Master board stages:

`Backlog, This week, Today, Tomorrow, Next week`

| Project slug | Name | Color | Tab (slug) | Tab columns |
|---|---|---|---|---|
| `aurora-app-launch` | Aurora app launch | `#b45a3c` | Launch (`launch`) | Design, Frontend dev, Backend dev, Content |
| `cove-brand-redesign` | Cove brand redesign | `#6b4f8c` | Brand (`brand`) | Design, Webflow, Content |
| `meridian-site-redesign` | Meridian site redesign | `#2f7a6e` | Website (`website`) | Design, Content |
| `shopify-store-migration` | Shopify store migration | `#8a5c2e` | Migration (`migration`) | Theme, Data & apps, SEO |

### Aurora app launch — Launch

| Card slug | Title | Task board column | Master board column | Done |
|---|---|---|---|---|
| `landing-hero-copy` | Landing hero copy | Content | Today | |
| `waitlist-flow` | Waitlist signup flow | Backend dev | Today | |
| `press-kit` | Press kit PDF | Content | This week | yes |
| `launch-day-checklist` | Launch day checklist | Backend dev | This week | |
| `pricing-section` | Pricing section | Frontend dev | Backlog | yes |
| `onboarding-email` | Onboarding email sequence | Content | Next week | |

### Cove brand redesign — Brand

| Card slug | Title | Task board column | Master board column | Done |
|---|---|---|---|---|
| `moodboard-signoff` | Moodboard sign-off | Design | Today | yes |
| `homepage-wireframes` | Homepage wireframes | Design | Today | |
| `type-color-system` | Type & color system | Design | This week | |
| `case-study-template` | Case study template | Content | This week | |
| `component-library` | Webflow component library | Webflow | Next week | |
| `asset-handoff` | Asset handoff pack | Content | Backlog | |

### Meridian site redesign — Website

| Card slug | Title | Task board column | Master board column | Done |
|---|---|---|---|---|
| `discovery-workshop` | Discovery workshop notes | Content | Today | yes |
| `ia-sitemap` | IA & sitemap | Design | Today | |
| `services-page` | Services page draft | Content | This week | |
| `lead-form` | Lead form + CRM hook | Content | This week | |
| `blog-templates` | Insights blog templates | Design | Next week | |
| `accessibility-pass` | Accessibility pass | Design | Backlog | |

### Shopify store migration — Migration

| Card slug | Title | Task board column | Master board column | Done |
|---|---|---|---|---|
| `catalog-export` | Catalog export & clean-up | Data & apps | Today | |
| `url-redirect-map` | URL redirect map | SEO | Today | yes |
| `dawn-theme-setup` | Dawn theme customization | Theme | This week | |
| `checkout-apps` | Checkout & apps install | Data & apps | This week | |
| `customer-accounts` | Customer account migration | Data & apps | Next week | yes |
| `go-live-rehearsal` | Go-live rehearsal | Theme | Backlog | |

Project descriptions live in each project’s `description` field in the JSON.

### Notes

- Database tabs are hidden in the UI; the API still supports nested `databases` / items in the JSON store for later use.
- New task boards default to columns `Design, Frontend dev, Backend dev, Content` until customized.
