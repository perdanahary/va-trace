# AGENTS.md — VA Trace Design System & Codebase Guide

## Project Overview
Procurement & logistics ops console (React 18 + Vite + Tailwind CSS v4). Client-rendered SPA with 5 role-based surfaces (admin, operator, analyst, client, vendor).

---

## 1. Design Tokens

### Colors — CSS Custom Properties in `src/index.css`

Tokens are defined as HSL triplets on `:root` (light) and `.dark` (dark) elements, then wired into Tailwind v4 via `@theme inline`:

```css
/* src/index.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-primary: hsl(var(--primary));
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-processing: #3B82F6;
}
```

**Status colors (hardcoded hex):**
- `success`: `#10B981`
- `warning`: `#F59E0B`
- `processing`: `#3B82F6`

### Typography — System font stack (no custom fonts)
```css
--font-sans: ui-sans-serif, system-ui, sans-serif;
```
Mono (`font-mono`) for IDs, references, quantities.

### Spacing & Radii
```css
--radius: 0.5rem;        /* lg */
--radius-md: calc(var(--radius) - 2px);
--radius-sm: calc(var(--radius) - 4px);
```

### Motion
```css
--ease-out-expo: cubic-bezier(0.23, 1, 0.32, 1);
```
Utility classes: `.btn-press` (scale 0.97 on active), `.animate-in-smart` (fade + scale + translate).

### Sidebar Tokens
```css
--sidebar, --sidebar-foreground, --sidebar-primary,
--sidebar-accent, --sidebar-border, --sidebar-ring
```

---

## 2. Component Library

### Architecture: shadcn/ui (Radix primitives + Tailwind + CVA)

Every component follows this pattern:
```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ...",
  {
    variants: {
      variant: { default: "...", destructive: "...", outline: "...", secondary: "...", ghost: "...", link: "..." },
      size: { default: "h-9 px-4", sm: "h-8 px-3", lg: "h-10 px-6", icon: "size-9", xs: "h-6 px-2", "icon-xs": "size-6", "icon-sm": "size-8", "icon-lg": "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return <Comp ref={ref} data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
```

### Utility: `cn()` — `clsx` + `tailwind-merge`
```tsx
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Component Directories
| Path | Purpose |
|------|---------|
| `src/components/ui/` | 29 shadcn primitives (button, card, table, dialog, badge, etc.) |
| `src/components/layout/` | Page shell: `Sidebar.tsx`, `Header.tsx`, `ContentArea.tsx`, `RoleSwitcherFloatingButton.tsx`, `UserAccountMenu.tsx` |
| `src/components/shared/` | Domain-specific shared: `FilterSection.tsx` |

### Custom Domain Components
- `StatusBadge.tsx` — Extends `Badge` with order lifecycle mapping (New, In Production, Ready to Ship, etc.) and `Partial X` composite badges.

### Layout Pattern
```tsx
// Every page uses this shell:
<div className="flex min-h-screen bg-background">
  <Sidebar role={role} />
  <ContentArea>
    <Header title="..." />
    <main className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* page content */}
    </main>
  </ContentArea>
</div>
```

### Component Rules (from DESIGN.md)
- Prefer variant-based styling over ad hoc class strings
- Extend existing shadcn components before building new ones
- No emojis, no neon glow, no pure black backgrounds
- No arbitrary inline color values unless documented status tokens

---

## 3. Frameworks & Libraries

| Category | Library | Version |
|----------|---------|---------|
| UI Framework | React | ^18.2.0 |
| Routing | react-router-dom | ^6.22.3 |
| Styling | Tailwind CSS | ^4.3.0 |
| Class Merging | clsx + tailwind-merge | — |
| Variants | class-variance-authority | — |
| Build | Vite | ^8.0.16 |
| Type Check | TypeScript | ^5.2.2 |
| Animation | framer-motion | ^11.0.8 |
| Theme | next-themes | ^0.4.6 |
| Table | @tanstack/react-table | ^8.21.3 |
| Virtualization | @tanstack/react-virtual | ^3.14.2 |
| Charts | recharts | ^3.8.0 |
| Toasts | sonner | ^2.0.7 |
| Validation | zod | ^4.4.3 |
| DnD | @dnd-kit | — |
| Testing | @playwright/test | ^1.42.1 |

### Radix UI Primitives (via shadcn)
`@radix-ui/react-avatar`, `react-checkbox`, `react-dialog`, `react-dropdown-menu`, `react-label`, `react-select`, `react-separator`, `react-slot`, `react-tabs`, `react-toggle-group` + `vaul` (drawer).

---

## 4. Asset Management

### Static Assets
- Single logo file: `src/assets/pmg-asia-logo.jpeg`
- Imported via: `import pmgAsiaLogo from "@/assets/pmg-asia-logo.jpeg"`
- Vite auto-hashes in production build
- **No `public/` directory exists**
- QR codes generated at runtime via `qrcode.react` (no asset file)

### Build Output
- `dist/` directory

---

## 5. Icon System

### Primary: `lucide-react` (configured in `components.json`)
```tsx
import { LayoutDashboard, Package, ShoppingCart, Users, Tag, Factory, Bookmark, Map, PlusCircle, ChevronRight, Mail } from "lucide-react";
```

### Usage Pattern
```tsx
<Button variant="ghost" size="sm" className="group" onClick={...}>
  View all
  <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
</Button>
```

### Icons in Sidebar Navigation
```tsx
const navItems: Record<UserRole, SidebarNavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Package, label: "All Orders", path: "/admin/orders" },
  ],
};
```

### Secondary library available: `@tabler/icons-react`

---

## 6. Styling Approach

### 100% Tailwind Utility Classes — No CSS Modules, no styled-components, no CSS-in-JS

### Tailwind v4 Entry Point (`src/index.css`)
```css
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/preflight" layer(base);
@import "tailwindcss/utilities" layer(utilities);
@custom-variant dark (&:where(.dark, .dark *));
```

### Dark Mode — class-based via `next-themes`
```tsx
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
```
The `.dark` class toggles all CSS variable values in `index.css`.

### Responsive Design
- Mobile-first Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Sidebar hidden on `<lg`, shown via Sheet (mobile drawer)
- Dashboard grids: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`
- Detail views: 2/3 + 1/3 split → single column on small screens

### Print Styles
- `@media print` block in `index.css` hides `.delivery-note-chrome` / `.packaging-label-chrome`
- A4 portrait layout (`@page { size: A4 portrait; margin: 0; }`)
- Delivery notes and packaging labels have dedicated CSS classes

---

## 7. Project Structure

```
src/
├── App.tsx                          # Router + ThemeProvider + Routes
├── main.tsx                         # ReactDOM.createRoot entry
├── index.css                        # Tailwind v4 + CSS vars + print styles
├── assets/
│   └── pmg-asia-logo.jpeg
├── components/
│   ├── layout/                      # Sidebar, Header, ContentArea, RoleSwitcher, UserAccountMenu
│   ├── ui/                          # 29 shadcn primitives
│   └── shared/                      # FilterSection
├── hooks/
│   └── use-mobile.ts
├── lib/                             # State, data, utilities
│   ├── utils.ts                     # cn()
│   ├── mockData.ts                  # 3428 lines — all mock data
│   ├── orderStore.ts                # Order CRUD (useSyncExternalStore + localStorage)
│   ├── orderStatus.ts               # Order status ranking & computation
│   ├── clientStore.ts               # Client CRUD (localStorage)
│   ├── userStore.ts                 # User CRUD
│   ├── supplierStore.ts             # Supplier CRUD
│   ├── productMaster.ts             # Product master data
│   ├── projectStore.ts              # Project name management
│   ├── deliveryNote.ts              # Delivery note / packaging label logic
│   ├── importStore.ts               # Bulk PO import workflow (1805 lines)
│   ├── salesPointSeed.ts            # Sales point seed data (2139 lines)
│   └── messages.ts                  # Inbox message mock data
├── modules/
│   └── data-cleaner/                # Excel Data Cleaner (SheetJS)
│       ├── types.ts
│       ├── utils/parser.ts
│       └── utils/cleaning.ts
└── pages/
    ├── admin/                       # 16 page components
    ├── client/                      # 2 page components
    ├── vendor/                      # 4 page components
    └── shared/                      # 6 page components (OrderProgress, DeliveryNotePrint, etc.)
```

---

## 8. Key Patterns

### State Management — localStorage + custom events (no external state lib)
```tsx
// src/lib/orderStore.ts
const STORAGE_KEY = "va-trace-orders";
const STORE_EVENT = "va-trace-orders:change";

export function useOrders() {
  return useSyncExternalStore(subscribe, readStoredOrders, () => mockOrders);
}
```

### Role-Based Routing
```tsx
// src/App.tsx — 5 roles with route prefix
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/operator" element={<AdminDashboard role="operator" />} />
<Route path="/client" element={<ClientDashboard />} />
<Route path="/vendor" element={<VendorDashboard />} />
```

### Status Badge Variant Mapping
```tsx
// src/components/ui/StatusBadge.tsx
const statusVariants = {
  New: "secondary",
  "In Production": "processing",
  Delivered: "success",
  Completed: "success",
  Overdue: "destructive",
  Waiting: "warning",
};
```

### Path Alias
`@/` → `./src` (configured in `vite.config.ts` and `tsconfig.json`)

---

## 9. Build & Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc && vite build` |
| `npm run lint` | `eslint . --ext ts,tsx` |
| `npm run preview` | Vite preview |
| `npm test` | Playwright E2E |

### Vite Config
```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

---

## 10. Figma MCP Integration

### Connected Tools (`opencode.json`)
- `figma` (remote) — https://mcp.figma.com/mcp
- `figma-console` (local) — `npx figma-console-mcp@latest` with `FIGMA_ACCESS_TOKEN`
- `jam` (remote) — https://mcp.jam.dev/mcp

### Design-to-Code Workflow
1. Use `search_design_system` to find existing components/tokens
2. Use `get_component_for_development` for deep component tree with design tokens
3. Use `get_variables` to extract design tokens → map to CSS custom properties
4. Implement using shadcn primitives + Tailwind utilities + `cn()`
5. Map Figma color tokens to `--primary`, `--secondary`, etc. in `src/index.css`
6. For new components: check existing shadcn primitives first, extend with CVA variants
7. Icons from Figma → `lucide-react` equivalents

### Token Mapping (Figma → Code)
| Figma Token | CSS Variable |
|-------------|-------------|
| background | `--background` |
| text/primary | `--foreground` |
| brand/primary | `--primary` |
| status/success | `--color-success` (#10B981) |
| status/warning | `--color-warning` (#F59E0B) |
| status/destructive | `--destructive` |
| border/default | `--border` |
| focus/ring | `--ring` |

### File Structure for New Components
```
src/components/ui/MyComponent.tsx   # shadcn-style primitive (Radix + cva + cn)
src/components/layout/              # or layout shell pieces
src/components/shared/              # or domain-specific shared
src/pages/{role}/MyPage.tsx         # route-level page
```

---

## 11. Git & Commits

### Branch Naming Convention
```
<type>/<task-id>-<slug>

# Examples:
feat/T1-user-auth
fix/T3.2-token-expiry
refactor/T5-delivery-progress
```
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`
- Task IDs: `T1`, `T2`, `T1.1`, `T2.3` (from task tracker)
- Slug: auto-generated from task ID, or explicit kebab-case

### Automation Scripts
| Command | Purpose |
|---------|---------|
| `npm run branch <type> <task-id> [slug]` | Create feature branch from main |
| `npm run branch:feat T1 "user auth"` | Shorthand for feat branches |
| `npm run branch:fix T3.2` | Shorthand for fix branches |
| `npm run pr:check` | Run lint + build before merge |
| `npm run pr:ready` | Full pre-merge validation |
| `bash scripts/git-setup.sh` | One-time git aliases setup |

### Conventional Commits (enforced by commit-msg hook)
```
<type>(<scope>): <description>

# Examples:
feat: add login endpoint
fix(auth): resolve token expiry race
refactor(ui): extract button variants
test: add login integration tests
chore: update dependencies
```
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`, `build`
- Scope: optional, lowercase (e.g. `(auth)`, `(api)`, `(ui)`)
- Description: lowercase, imperative, max 72 chars

### Agentic Workflow
1. Create branch: `npm run branch feat T1 "user auth"`
2. Agent works on branch, makes commits
3. Validate: `npm run pr:check`
4. Review: `git diff main...HEAD`
5. Merge to main, delete branch

### Git Aliases (after running setup)
```
git co    → checkout
git br    → branch
git st    → status
git lg    → pretty log
git wip   → quick save (no verify)
git undo  → undo last commit (keep changes)
git amend → amend last commit
```
