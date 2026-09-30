# Malom

Local workspace for freelance projects — markdown vault under `projects/`, served by `server.js`.

```bash
npm start
# → http://localhost:3456
```

## Demo data (`isDemo`)

The seeded vault is sample freelancer work. Every **project**, **task board (tab)**, and **task card** in that seed is marked with an invisible frontmatter flag:

```yaml
isDemo: true
```

- Not shown in the UI.
- Exposed on the API (`project.isDemo`, `board.isDemo`, `card.isDemo`) so a future “Remove demo data” control can delete only flagged items and leave user-created work alone.
- User-created projects / boards / cards must **omit** `isDemo` (or set it false). Writes preserve an existing `isDemo: true` when editing demo entities so saves don’t strip the flag.

### Planned UX (not implemented yet)

New users start from this demo state. A button should:

1. Delete all projects with `isDemo: true` (and their boards/cards), **or** delete only boards/cards flagged `isDemo` inside mixed projects if that model is preferred later.
2. Leave anything without `isDemo` untouched.
3. Optionally clear leftover hidden `databases/` folders under demo project slugs.

Until that exists, restore the seed via git (see below).

## Seed snapshot (revert target)

Master board stages (`projects/workspace.md`):

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

Cover copy for each project lives in `projects/<slug>/project.md` (body = description).

### Notes

- Database tabs are hidden in the UI; some projects still have leftover `databases/` folders from earlier prototypes. They are not part of the active demo surface and are not flagged with `isDemo`.
- New task boards default to columns `Design, Frontend dev, Backend dev, Content` until customized.

## Restoring this state

From a clean git history that contains this seed:

```bash
git checkout -- projects/
# or reset the whole repo to the commit that introduced / last updated this seed
```

After restore, restart `npm start` if the server was running with a different vault in memory (reads are from disk per request, so a refresh is usually enough).
