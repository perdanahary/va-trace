# Design System: VA Trace (Officebee)

## 1. Purpose
This document defines the visual language and implementation rules for VA Trace. It is written for a codebase that uses shadcn/ui as the component primitive layer, Tailwind CSS v4, React, and Vite.

The goal is to keep the product:
- enterprise-grade
- information-dense
- calm and readable
- consistent across admin, vendor, and client surfaces

## 2. Stack and Implementation Contract
### Core stack
- React + Vite
- Tailwind CSS v4
- shadcn/ui-style components copied into the codebase
- Radix UI primitives for behavior
- `lucide-react` for icons
- `next-themes` for light/dark switching
- `class-variance-authority` and `tailwind-merge` through `cn()`

### shadcn implementation rules
- Components live in `src/components/ui`
- Shared utilities live in `src/lib/utils.ts`
- Use `cn()` for every class merge that combines base styles, variants, and caller overrides
- Prefer shadcn component composition over custom one-off UI
- Build custom UI by extending existing shadcn primitives, not by bypassing them
- Keep all design tokens in CSS variables, not hardcoded random colors in component files

### Current shadcn configuration
- `style`: `new-york`
- `tsx`: `true`
- `rsc`: `false`
- `iconLibrary`: `lucide`
- `tailwind.css`: `src/index.css`
- `baseColor`: `neutral`
- `cssVariables`: `true`
- aliases:
  - `@/components`
  - `@/components/ui`
  - `@/lib`
  - `@/lib/utils`
  - `@/hooks`

## 3. Visual Theme and Product Feel
VA Trace should feel like a precise operations console for procurement and logistics.

The interface should be:
- restrained, not decorative
- dense, but not cramped
- structured, not overly boxy
- confident, not flashy

Use a "cockpit dense" approach for dashboards:
- metrics first
- action entry points are obvious
- tables and timelines carry the majority of content
- detail views use asymmetric splits when the content benefits from it

## 4. Color System
### Base surfaces
- Canvas White: main background
- Pure Surface: cards, sheets, popovers
- Whisper Border: structural dividers
- Charcoal Ink: primary text
- Muted Steel: secondary text and metadata

### Interactive color
- Procurement Blue: primary brand action, focus state, active states

### Status colors
- Success Green: completed, accepted
- Urgent Red: overdue, failure, destructive
- Warning Amber: pending, waiting, needs attention
- Processing Blue: in progress, shipping, working

### shadcn token mapping
Use CSS variables in `src/index.css` as the source of truth:
- `--background`
- `--foreground`
- `--card`
- `--card-foreground`
- `--popover`
- `--popover-foreground`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--muted`
- `--muted-foreground`
- `--accent`
- `--accent-foreground`
- `--destructive`
- `--destructive-foreground`
- `--border`
- `--input`
- `--ring`

Do not invent parallel theme systems inside components.

## 5. Typography
### Rules
- Use a clean sans-serif system that matches the existing codebase
- Keep hierarchy driven by size and weight, not excessive color changes
- Preserve readable line length on detail pages and forms
- Use mono for IDs, references, quantities, and dense operational numbers

### Implementation note
The current implementation uses the CSS font stack in `src/index.css`. If a branded font is introduced later, it must be wired through the same token layer and not hardcoded per component.

### Banned
- serif fonts
- decorative display fonts
- generic "AI landing page" typography
- over-wide line lengths for body content

## 6. Component System
### Principle
shadcn/ui components are not a visual gimmick. They are the baseline UI primitives used to keep interaction behavior, accessibility, and styling consistent.

### Use shadcn for
- `Button`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Toggle`
- `Dialog`
- `Sheet`
- `DropdownMenu`
- `Tabs`
- `Badge`
- `Card`
- `Table`
- `Avatar`
- `Breadcrumb`
- `Separator`
- `Tooltip`
- `Alert`
- `Drawer`
- `Progress`
- `Skeleton`
- `Form`
- `Sonner`

### Component design rules
- Buttons stay flat and tactile
- Cards are for grouped content, not for every row
- Inputs use a clear label, clear focus ring, and visible error text
- Badges should be low-noise and status-driven
- Tables should remain readable at dense scale
- Sheets and dialogs should feel lightweight and focused

### Variant strategy
- Prefer variant-based styling over ad hoc class strings
- Keep component APIs small and predictable
- Extend existing shadcn components with variants when a new state is needed
- Use `cn()` to compose caller overrides without breaking the base contract

## 7. Layout Principles
### Dashboard layout
- Use CSS Grid as the primary layout tool
- Keep a stable content rhythm across pages
- Use 12-column thinking for desktop dashboards
- Put the most important KPI and action area at the top

### Detail views
- Favor a 2/3 main content and 1/3 metadata or timeline split when the page has operational detail
- Collapse to one column on small screens
- Keep the right rail utility-oriented, not decorative

### Tables and lists
- Dense tables are acceptable
- Avoid unnecessary card wrappers around every row
- Use dividers, hover states, and row actions for clarity
- Keep column labels concise and stable

## 8. Motion and Interaction
### Motion rules
- Keep interaction motion under 250ms
- Use subtle easing, not springy novelty
- Avoid `scale(0)` entrances
- Prefer `opacity` + small translate or `scale(0.95)` for entry

### Active states
- All pressable elements should feel responsive
- A press scale of `0.97` is acceptable for buttons and chips
- Hover should clarify affordance, not radically change layout

### Existing motion helpers
Use the shared utilities already present in `src/index.css`:
- `btn-press`
- `animate-in-smart`
- `ease-out-expo`

## 9. Dark Mode
- Dark mode is class-based
- The `.dark` class is the switch point
- Theme values must come from CSS variables, not hardcoded dark palettes in component files
- Components should work in both themes without special-case overrides unless absolutely required

## 10. Accessibility
### Minimum standard
- All controls must be keyboard reachable
- Use semantic elements first
- Maintain visible focus states
- Label form fields explicitly
- Ensure dialog and sheet content has a clear close affordance

### shadcn advantage
Use shadcn/Radix behavior for focus management, menus, dialogs, and select controls instead of rebuilding those interactions manually.

## 11. Domain-Specific Patterns
### Procurement and logistics
- Status badges should communicate state instantly
- IDs and references should use mono styling
- Progress indicators should be thin and information-rich
- Dense metadata blocks should be aligned and scannable

### Admin workflows
- Search, filter, sort, and bulk actions should be visible without extra clicks
- Tables should support row actions through dropdown menus
- Destructive actions must be visually distinct and intentionally placed

### Client and vendor surfaces
- Reduce density slightly compared with admin pages when the task is tracking and review
- Preserve the same tokens and component language
- Keep CTA hierarchy consistent across roles

## 12. Recommended Implementation Conventions
### File organization
- `src/components/ui/*` for primitives
- `src/components/layout/*` for shell pieces like header and sidebar
- `src/pages/*` for route-level screens
- `src/lib/utils.ts` for shared helpers such as `cn()`

### Component authoring rules
- Start from existing shadcn building blocks
- Add variants before adding new bespoke components
- Keep presentational logic close to the component, but not mixed with domain logic
- Use icons from `lucide-react` consistently

### If a new component is needed
1. Check whether an existing shadcn primitive already solves the problem
2. Extend the primitive with a variant or wrapper
3. Keep the API minimal
4. Ensure the result matches the same token and spacing system

## 13. Anti-Patterns
- No emojis
- No neon glow or decorative shadows
- No pure black backgrounds
- No generic placeholder names or filler copy
- No arbitrary inline color values unless they represent a documented status token
- No one-off styling that bypasses the component system
- No custom controls that duplicate shadcn/Radix behavior without a strong reason
- No overlapping elements unless the layout explicitly calls for it

## 14. What "Good" Looks Like
A good VA Trace screen should have:
- a clear header
- obvious primary actions
- stable table or card layout
- consistent token-driven colors
- accessible shadcn primitives
- restrained motion
- enough density to support operational work without visual noise

If a screen looks impressive but is harder to scan or act on, it is not correct for this product.
