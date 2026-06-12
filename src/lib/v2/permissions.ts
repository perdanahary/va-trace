/**
 * P2-03 — Permission selectors and route decisions (CR-08).
 *
 * This module is intentionally pure: pages and route guards can call it without
 * importing stores. Store commands still enforce write safety; these selectors
 * provide consistent UI disabled reasons and route-access decisions.
 */

import type { ActionDecision, AuthClaims, AuthorizationScopeName, ID, UserRole } from "@/lib/types/v2/foundation";
import { DEFAULT_ROLE_SCOPES } from "@/lib/types/v2/scope";

export interface ResourceScope {
  clientId?: ID | null;
  vendorId?: ID | null;
  projectId?: ID | null;
}

export interface RouteDecision extends ActionDecision {
  redirectTo?: string;
}

const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/admin",
  OPERATOR: "/operator",
  ANALYST: "/analyst",
  CLIENT: "/client",
  VENDOR: "/vendor",
};

const ROUTE_PREFIX_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/operator", roles: ["OPERATOR"] },
  { prefix: "/analyst", roles: ["ANALYST"] },
  { prefix: "/client", roles: ["CLIENT"] },
  { prefix: "/vendor", roles: ["VENDOR"] },
];

export function scopesForRole(role: UserRole): AuthorizationScopeName[] {
  return DEFAULT_ROLE_SCOPES[role];
}

export function buildDemoClaims(role: UserRole, userId = `demo-${role.toLowerCase()}`): AuthClaims {
  return {
    userId,
    role,
    clientIds: role === "CLIENT" ? ["CLIENT-DEMO"] : [],
    vendorIds: role === "VENDOR" ? ["VENDOR-DEMO"] : [],
    delegatedPermissions: scopesForRole(role),
  };
}

export function hasScope(claims: AuthClaims, scope: AuthorizationScopeName): boolean {
  return new Set([...(claims.delegatedPermissions ?? []), ...scopesForRole(claims.role)]).has(scope);
}

export function decideScope(claims: AuthClaims, scope: AuthorizationScopeName): ActionDecision {
  if (hasScope(claims, scope)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    missingScope: scope,
    disabledReason: `Missing permission: ${scope}`,
  };
}

export function decideResourceAccess(claims: AuthClaims, resource: ResourceScope): ActionDecision {
  const failures: string[] = [];

  if (claims.role === "CLIENT" && resource.clientId && !claims.clientIds.includes(resource.clientId)) {
    failures.push("This order belongs to another client.");
  }
  if (claims.role === "VENDOR" && resource.vendorId && !claims.vendorIds.includes(resource.vendorId)) {
    failures.push("This order belongs to another vendor.");
  }
  if (resource.projectId && claims.projectIds?.length && !claims.projectIds.includes(resource.projectId)) {
    failures.push("This project is outside your assigned scope.");
  }

  return failures.length > 0
    ? { allowed: false, disabledReason: failures[0], preconditionFailures: failures }
    : { allowed: true };
}

export function decideAction(
  claims: AuthClaims,
  scope: AuthorizationScopeName,
  resource: ResourceScope = {},
  preconditions: string[] = [],
): ActionDecision {
  const scopeDecision = decideScope(claims, scope);
  if (!scopeDecision.allowed) return scopeDecision;

  const resourceDecision = decideResourceAccess(claims, resource);
  if (!resourceDecision.allowed) return resourceDecision;

  if (preconditions.length > 0) {
    return {
      allowed: false,
      disabledReason: preconditions[0],
      preconditionFailures: preconditions,
    };
  }

  return { allowed: true };
}

export function decideRouteAccess(claims: AuthClaims, path: string): RouteDecision {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const route = ROUTE_PREFIX_ROLES.find(
    (entry) => normalizedPath === entry.prefix || normalizedPath.startsWith(`${entry.prefix}/`),
  );

  if (!route) {
    return { allowed: true };
  }
  if (route.roles.includes(claims.role)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    disabledReason: "This route is not available for your role.",
    redirectTo: ROLE_HOME[claims.role],
  };
}

export function canReadOrders(claims: AuthClaims, resource?: ResourceScope): ActionDecision {
  return decideAction(claims, "orders:read", resource);
}

export function canWriteOrders(claims: AuthClaims, resource?: ResourceScope, preconditions?: string[]): ActionDecision {
  return decideAction(claims, "orders:write", resource, preconditions);
}

export function canCreateShipment(claims: AuthClaims, resource?: ResourceScope, preconditions?: string[]): ActionDecision {
  return decideAction(claims, "shipments:create", resource, preconditions);
}

export function canDispatchShipment(claims: AuthClaims, resource?: ResourceScope, preconditions?: string[]): ActionDecision {
  return decideAction(claims, "shipments:dispatch", resource, preconditions);
}

export function canUploadPod(claims: AuthClaims, resource?: ResourceScope, preconditions?: string[]): ActionDecision {
  return decideAction(claims, "pod:upload", resource, preconditions);
}

export function canVerifyPod(claims: AuthClaims, resource?: ResourceScope, preconditions?: string[]): ActionDecision {
  return decideAction(claims, "pod:verify", resource, preconditions);
}
