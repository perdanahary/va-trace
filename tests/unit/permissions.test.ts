import { describe, expect, it } from "vitest";

import {
  buildDemoClaims,
  canCreateShipment,
  canReadOrders,
  canUploadPod,
  canVerifyPod,
  decideRouteAccess,
  decideScope,
} from "@/lib/v2/permissions";

describe("V2 permission selectors (P2-03)", () => {
  it("allows role-default scopes without duplicating delegated permissions", () => {
    const admin = buildDemoClaims("ADMIN");

    expect(decideScope(admin, "pod:verify").allowed).toBe(true);
    expect(canVerifyPod(admin).allowed).toBe(true);
  });

  it("returns disabled reasons for missing scopes", () => {
    const analyst = buildDemoClaims("ANALYST");

    const decision = canCreateShipment(analyst);

    expect(decision.allowed).toBe(false);
    expect(decision.missingScope).toBe("shipments:create");
    expect(decision.disabledReason).toContain("shipments:create");
  });

  it("blocks wrong-client and wrong-vendor scoped resources", () => {
    const client = { ...buildDemoClaims("CLIENT"), clientIds: ["CLIENT-1"] };
    const vendor = { ...buildDemoClaims("VENDOR"), vendorIds: ["VENDOR-1"] };

    expect(canReadOrders(client, { clientId: "CLIENT-2" })).toMatchObject({
      allowed: false,
      disabledReason: "This order belongs to another client.",
    });
    expect(canUploadPod(vendor, { vendorId: "VENDOR-2" })).toMatchObject({
      allowed: false,
      disabledReason: "This order belongs to another vendor.",
    });
  });

  it("returns role home redirects for wrong route prefixes", () => {
    const vendor = buildDemoClaims("VENDOR");
    const admin = buildDemoClaims("ADMIN");

    expect(decideRouteAccess(vendor, "/admin/orders")).toMatchObject({
      allowed: false,
      redirectTo: "/vendor",
    });
    expect(decideRouteAccess(admin, "/admin/orders")).toMatchObject({ allowed: true });
  });
});
