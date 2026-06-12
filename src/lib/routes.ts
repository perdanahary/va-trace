/**
 * P2-01 — Canonical route constants and redirect table (HI-10).
 * Source: docs/implementation/03-routing-refactor.md (Target Route Map).
 * Pages must use these constants instead of raw path strings.
 */

export type RolePrefix = "/admin" | "/operator" | "/analyst" | "/client" | "/vendor";

export const ROUTES = {
  admin: {
    dashboard: "/admin",
    orders: "/admin/orders",
    orderDetail: (id: string) => `/admin/orders/${id}`,
    create: "/admin/create",
    imports: "/admin/imports",
    production: "/admin/production",
    shipments: "/admin/shipments",
    shipmentDetail: (id: string) => `/admin/shipments/${id}`,
    shipmentDeliveryNote: (id: string) => `/admin/shipments/${id}/delivery-note`,
    shipmentLabels: (id: string) => `/admin/shipments/${id}/labels`,
    deliveryNotes: "/admin/delivery-notes",
    labels: "/admin/labels",
    pod: "/admin/pod",
    exceptions: "/admin/exceptions",
    salesPoints: "/admin/sales-points",
    salesPointDetail: (id: string) => `/admin/sales-points/${id}`,
    suppliers: "/admin/suppliers",
    inbox: "/admin/inbox",
  },
  operator: {
    dashboard: "/operator",
    orders: "/operator/orders",
    shipments: "/operator/shipments",
    deliveryNotes: "/operator/delivery-notes",
  },
  vendor: {
    dashboard: "/vendor",
    orders: "/vendor/orders",
    orderWorkbench: (id: string) => `/vendor/orders/${id}`,
    production: "/vendor/production",
    shipments: "/vendor/shipments",
    shipmentDetail: (id: string) => `/vendor/shipments/${id}`,
    shipmentDeliveryNote: (id: string) => `/vendor/shipments/${id}/delivery-note`,
    shipmentLabels: (id: string) => `/vendor/shipments/${id}/labels`,
    shipmentPod: (id: string) => `/vendor/shipments/${id}/pod`,
    deliveryNotes: "/vendor/delivery-notes",
    pod: "/vendor/pod",
    profile: "/vendor/profile",
    inbox: "/vendor/inbox",
  },
  client: {
    dashboard: "/client",
    orders: "/client/orders",
    progress: "/client/progress",
    create: "/client/create",
  },
} as const;

/** Legacy -> canonical redirects (docs/implementation/03, Route migration table). */
export const REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/admin/logistics", to: ROUTES.admin.shipments },
  { from: "/admin/logistics/shipments", to: ROUTES.admin.shipments },
  { from: "/admin/logistics/shipments/:batchId", to: "/admin/shipments/:batchId" },
  { from: "/admin/logistics/delivery-notes", to: ROUTES.admin.deliveryNotes },
  { from: "/admin/logistics/pod", to: ROUTES.admin.pod },
  { from: "/vendor/update/:id", to: "/vendor/orders/:id" },
];
