/**
 * P1-16 — Workflow policy store (CR-04).
 * Storage key: `va-trace-v2-policies`.
 *
 * Resolution by specificity: PROJECT > CLIENT_VENDOR > CLIENT > VENDOR > GLOBAL
 * (docs/api-contracts/shared-foundation-api.md §7).
 */

import type { ID } from "@/lib/types/v2/foundation";
import type { WorkflowPolicy, WorkflowPolicyScope } from "@/lib/types/v2/policy";
import { createCollectionStore } from "@/lib/v2/repository";
import { defaultGlobalPolicy } from "@/lib/v2/seed/seedBuilders";

const store = createCollectionStore<WorkflowPolicy>({
  storageKey: "va-trace-v2-policies",
  entityType: "WORKFLOW_POLICY",
  seed: () => [defaultGlobalPolicy()],
});

const SCOPE_PRECEDENCE: WorkflowPolicyScope[] = ["PROJECT", "CLIENT_VENDOR", "CLIENT", "VENDOR", "GLOBAL"];

export interface PolicyContext {
  clientId?: ID;
  projectId?: ID;
  vendorId?: ID;
}

/** Resolves the effective policy for a workflow context (most specific wins). */
export function resolveWorkflowPolicy(context: PolicyContext = {}): WorkflowPolicy {
  const policies = store.getAll();

  const matches = (policy: WorkflowPolicy): boolean => {
    switch (policy.scope) {
      case "PROJECT":
        return Boolean(context.projectId) && policy.projectId === context.projectId;
      case "CLIENT_VENDOR":
        return (
          Boolean(context.clientId) &&
          Boolean(context.vendorId) &&
          policy.clientId === context.clientId &&
          policy.vendorId === context.vendorId
        );
      case "CLIENT":
        return Boolean(context.clientId) && policy.clientId === context.clientId;
      case "VENDOR":
        return Boolean(context.vendorId) && policy.vendorId === context.vendorId;
      case "GLOBAL":
        return true;
    }
  };

  for (const scope of SCOPE_PRECEDENCE) {
    const match = policies.find((policy) => policy.scope === scope && matches(policy));
    if (match) {
      return match;
    }
  }
  return defaultGlobalPolicy();
}

export function useWorkflowPolicies(): WorkflowPolicy[] {
  return store.useAll();
}
