/**
 * P1-08 — Authorization scope model (CR-08).
 *
 * The primitive claim/decision shapes live in `foundation.ts` because
 * `ApiError.permission` references `AuthorizationScopeName`. This module adds
 * the default role->scope grants used by route guards and permission selectors.
 */

import type { AuthorizationScopeName, UserRole } from "./foundation";

export type { ActionDecision, AuthClaims, AuthorizationScopeName } from "./foundation";

/** Default scope grants per role (docs/specs/10-role-permission-spec.md §8). */
export const DEFAULT_ROLE_SCOPES: Record<UserRole, AuthorizationScopeName[]> = {
  ADMIN: [
    "orders:read",
    "orders:write",
    "production:update",
    "shipments:create",
    "shipments:dispatch",
    "documents:print",
    "labels:manage",
    "pod:verify",
    "exceptions:manage",
    "master-data:manage",
    "reports:export",
  ],
  OPERATOR: [
    "orders:read",
    "orders:write",
    "shipments:create",
    "shipments:dispatch",
    "documents:print",
    "labels:manage",
    "reports:export",
  ],
  ANALYST: ["orders:read", "reports:export"],
  VENDOR: [
    "orders:read",
    "production:update",
    "shipments:create",
    "shipments:dispatch",
    "documents:print",
    "labels:manage",
    "pod:upload",
  ],
  CLIENT: ["orders:read", "orders:write"],
};
