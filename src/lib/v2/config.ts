/**
 * V2 rollout configuration (Phase 1 rollback strategy).
 *
 * `v2DomainEnabled` gates V2 store reads from the UI. Disabling it routes all
 * screens back to the legacy `orderStore` (`va-trace-orders`); deleting the
 * `va-trace-v2-*` keys completes a full rollback.
 */

const FLAG_KEY = "va-trace-v2-enabled";

export function isV2DomainEnabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(FLAG_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setV2DomainEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FLAG_KEY, String(enabled));
  } catch {
    // ignore
  }
}
