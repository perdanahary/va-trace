# Amend Order Feature Implementation

## Overview
The Amend Order feature allows administrators to modify existing orders through a dedicated page.

## Routing Changes

### App.tsx
```tsx
import { AdminAmendOrder } from './pages/admin/AdminAmendOrder';

// Added route:
<Route path="/admin/orders/:id/amend" element={<AdminAmendOrder />} />
```

### routes.ts
```ts
export const ROUTES = {
  admin: {
    orderAmend: (id: string) => `/admin/orders/${id}/amend`,
  }
}
```

## Component Structure (AdminAmendOrder.tsx)

The component would have been located at:
`src/pages/admin/AdminAmendOrder.tsx`

### Expected Features:
- Form to edit order details
- Order status management
- Client and product selection
- Quantity and pricing adjustments
- Save/cancel functionality
- Navigation back to order detail

### Dependencies:
- React Router for `useParams` and `useNavigate`
- Order store for data management
- UI components from shadcn/ui

## Integration Points

1. **OrderDetail.tsx** - Would include "Amend Order" button linking to the amend page
2. **Order Store** - Would use existing `updateOrder` function
3. **Status System** - Would integrate with existing status management

## Patch File Location
The routing changes are preserved in:
`/tmp/amend-order-changes.patch`

To apply these changes later:
```bash
git apply /tmp/amend-order-changes.patch
```
