# Graph Report - couraged-pos  (2026-10-14)

## Corpus Check
- 49 files · ~61,240 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 376 nodes · 1025 edges · 17 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.87)
- Token cost: 122,507 input · 0 output

## Community Hubs (Navigation)
- Reports & Date Ranges
- Auth & Shared UI
- Product Domain & Staff API
- Money Utils & Inventory
- Payroll Calculations
- PDF Generation
- App Shell & Routing
- Expenses Page
- Package Manifest
- Runtime Dependencies
- Staff Management Page
- Database Tests
- NPM Scripts
- Dev Dependencies
- Brand Icons & Logo
- Entry Point & Fonts
- Vercel Config

## God Nodes (most connected - your core abstractions)
1. `money()` - 45 edges
2. `Sheet()` - 20 edges
3. `PayRun()` - 20 edges
4. `motion` - 17 edges
5. `react` - 17 edges
6. `useAuth()` - 16 edges
7. `fmtDateTime()` - 16 edges
8. `lucide-react` - 15 edges
9. `manilaToday()` - 15 edges
10. `ExpenseSheet()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `handleStaff()`  [EXTRACTED]
  api/staff.js → server/staff.js
- `robots noindex, nofollow` --conceptually_related_to--> `CourageD POS`  [INFERRED]
  index.html → README.md
- `Shell()` --calls--> `Inventory()`  [EXTRACTED]
  src/App.jsx → src/pages/Inventory.jsx
- `Shell()` --calls--> `Register()`  [EXTRACTED]
  src/App.jsx → src/pages/Register.jsx
- `DownloadSheet()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/Analytics.jsx → src/auth.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Payroll posts to Expenses, summarized in PDF Reports** — readme_payroll, readme_expenses, readme_reports, readme_ph_contributions [EXTRACTED 1.00]
- **Staff account management and role enforcement** — readme_staff_page, api_staff, readme_service_role_key, readme_role_model [EXTRACTED 1.00]
- **CouRageD PWA Icon Set** — public_assets_icon_192_app_icon, public_assets_icon_512_app_icon, public_assets_icon_512_maskable_maskable_icon, public_assets_apple_touch_icon_apple_touch_icon, public_assets_logo_couraged_brand_logo [INFERRED 0.85]

## Communities (17 total, 0 thin omitted)

### Community 0 - "Reports & Date Ranges"
Cohesion: 0.09
Nodes (55): addDays(), fmtDay(), monthStart(), presets(), RangePicker(), downloadPayslips(), downloadSalesReport(), fetchAll() (+47 more)

### Community 1 - "Auth & Shared UI"
Cohesion: 0.13
Nodes (42): lucide-react, motion, react, AuthCtx, field, label, MoneyField(), Notice() (+34 more)

### Community 2 - "Product Domain & Staff API"
Cohesion: 0.07
Nodes (27): handler(), index.html app shell, PWA / mobile web-app meta tags, Analytics, Shared brand tokens, CourageD marketing site (../couraged), CourageD POS, Expenses (+19 more)

### Community 3 - "Money Utils & Inventory"
Cohesion: 0.14
Nodes (34): CountUp(), Segmented(), stockOf(), money(), moneyInput(), quickCash(), round2(), uuid() (+26 more)

### Community 4 - "Payroll Calculations"
Cohesion: 0.11
Nodes (25): addToPrior(), clamp(), computePayslip(), EMPTY_PRIOR, pagibig(), PERIODS_PER_MONTH, philhealth(), round2() (+17 more)

### Community 5 - "PDF Generation"
Cohesion: 0.15
Nodes (26): amt(), CRIMSON, day(), footer(), GOLD, header(), INK, LINE (+18 more)

### Community 6 - "App Shell & Routing"
Cohesion: 0.15
Nodes (22): animejs, Analytics, App(), Expenses, Gate(), Main(), NAV, Payroll (+14 more)

### Community 7 - "Expenses Page"
Cohesion: 0.24
Nodes (18): Sheet(), BillsSheet(), CategoriesSheet(), EXP_FIELD, ExpenseHistory(), Expenses(), ExpenseSheet(), fmtDay() (+10 more)

### Community 8 - "Package Manifest"
Cohesion: 0.16
Nodes (13): name, private, type, version, jspdf, jspdf-autotable, react-router, recharts (+5 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, animejs, @fontsource/barlow, @fontsource-variable/big-shoulders-display, jspdf, jspdf-autotable, lucide-react, motion (+5 more)

### Community 10 - "Staff Management Page"
Cohesion: 0.40
Nodes (12): fmtDateTime(), AddSheet(), EditSheet(), Handover(), makePassword(), PasswordField(), Problem(), ROLE (+4 more)

### Community 11 - "Database Tests"
Cohesion: 0.18
Nodes (8): @electric-sql/pglite, as(), db, dir, fails(), files, gcashCart, items

### Community 12 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, dev:tablet, preview, test, test:api, test:db (+2 more)

### Community 13 - "Dev Dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @electric-sql/pglite, tailwindcss, @tailwindcss/vite, vite, vite-plugin-pwa, @vitejs/plugin-react

### Community 14 - "Brand Icons & Logo"
Cohesion: 0.53
Nodes (6): Apple Touch Icon, PWA Icon 192x192, PWA Icon 512x512, PWA Maskable Icon 512x512, CouRageD Brand Logo, PWA Install Icons

### Community 15 - "Entry Point & Fonts"
Cohesion: 0.40
Nodes (3): @fontsource/barlow, @fontsource-variable/big-shoulders-display, react-dom

### Community 16 - "Vercel Config"
Cohesion: 0.50
Nodes (3): framework, outputDirectory, rewrites

## Ambiguous Edges - Review These
- `CourageD POS` → `Vercel deployment`  [AMBIGUOUS]
  README.md · relation: references

## Knowledge Gaps
- **98 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+93 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 113 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `CourageD POS` and `Vercel deployment`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `@supabase/supabase-js` connect `Product Domain & Staff API` to `Package Manifest`, `Auth & Shared UI`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _98 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reports & Date Ranges` be split into smaller, more focused modules?**
  _Cohesion score 0.09409701928696669 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Auth & Shared UI` to `Reports & Date Ranges`, `Money Utils & Inventory`, `App Shell & Routing`, `Expenses Page`, `Package Manifest`, `Staff Management Page`, `Entry Point & Fonts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `Auth & Shared UI` be split into smaller, more focused modules?**
  _Cohesion score 0.12594268476621417 - nodes in this community are weakly interconnected._
- **Why does `money()` connect `Money Utils & Inventory` to `Reports & Date Ranges`, `Auth & Shared UI`, `Expenses Page`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._