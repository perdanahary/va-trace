# Design System: VA Trace (Officebee)

## 1. Visual Theme & Atmosphere
A restrained, **Enterprise Balanced** interface that feels like a precision tool for procurement. The atmosphere is functional, clean, and data-dense but not overwhelming. It uses a "Cockpit Dense" (8/10) strategy for dashboards, prioritizing readability of status and metrics. Layouts are offset asymmetrically to create a modern, high-agency feel.

## 2. Color Palette & Roles
- **Canvas White** (#F9FAFB) — Primary background surface.
- **Pure Surface** (#FFFFFF) — Card and container fill.
- **Charcoal Ink** (#09090B) — Primary text (Zinc-950).
- **Muted Steel** (#71717A) — Secondary text, metadata, and labels.
- **Whisper Border** (#E2E8F0) — 1px structural lines and subtle borders.
- **Procurement Blue** (#2563EB) — Primary accent for active states, CTAs, and focus rings.

### Status Indicators (Calibrated)
- **Success Green** (#10B981) — Completed / Accepted states.
- **Urgent Red** (#EF4444) — Overdue / Urgent (< 3 days) states.
- **Warning Amber** (#F59E0B) — Waiting / Pending states.
- **Processing Blue** (#3B82F6) — In Production / Shipping states.

## 3. Typography Rules
- **Display/Headlines:** `Satoshi` or `Geist` — Track-tight, controlled scale. Hierarchy driven by weight (Medium/Bold).
- **Body:** `Satoshi` or `Geist` — Relaxed leading (1.5), 65ch max-width.
- **Mono:** `JetBrains Mono` or `Geist Mono` — Mandatory for Order IDs, PO References, Quantities, and High-Density numbers.
- **Banned:** `Inter`, generic system fonts, and all serif fonts.

## 4. Component Stylings
* **Buttons:** Flat, no outer glow. Tactile **-1px scale (0.97)** translate on active. 
* **Cards:** Subtly rounded corners (0.75rem). Used only for metric summaries. In tables/lists, replace with clean border-bottom dividers.
* **Inputs:** Label above, error below. Focus ring in **Procurement Blue**. 
* **Status Badges:** Pills with low-saturation backgrounds and high-contrast text. No heavy borders.
* **Fulfillment Progress Bars:** Thin, high-contrast bars (e.g., 4px height) showing Production vs. Shipped vs. Delivered.

## 5. Layout Principles
- **Grid Systems:** CSS Grid over Flexbox math. 12-column master grid for dashboards.
- **Cockpit Density:** Metrics at the top, primary action (Create OR) in the header/sidebar, data tables filling the main view.
- **Asymmetric Splits:** Detail views use a 2/3 (Order Content) and 1/3 (Timeline/Metadata) split.
- **Mobile-First:** Single-column collapse below 768px.

## 6. Motion & Interaction (Emil's Principles)
- **Easing:** Custom `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`.
- **Duration:** Stay under **250ms** for all UI interactions.
- **Entry:** Never animate from `scale(0)`. Use `scale(0.95)` + `opacity: 0`.
- **Responsive Press:** Every interactive element scales to `0.97` on press.
- **Staggered Orchestration:** Data table rows cascade with **30ms** delay.

## 7. Anti-Patterns (Banned)
- No emojis.
- No `Inter` font.
- No pure black (#000000).
- No neon/outer glow shadows.
- No generic names ("John Doe", "Acme").
- No AI copywriting clichés ("Seamless", "Elevate").
- No filler UI text ("Scroll to explore").
- No overlapping elements.
