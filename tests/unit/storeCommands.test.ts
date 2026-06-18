import { beforeAll, describe, expect, it } from "vitest";

import type { CommandMetadata } from "@/lib/types/v2/foundation";
import { ApiCommandError } from "@/lib/types/v2/foundation";
import { getOrderRequests } from "@/lib/v2/orderRequestStore";
import { getAllocationsForOrder } from "@/lib/v2/allocationStore";
import { acceptProductionJob, getProductionJobsForOrder, updateProductionProgress } from "@/lib/v2/productionStore";
import { getActiveDeliveryNoteForBatch, getDeliveryNotesForOrder } from "@/lib/v2/deliveryNoteStore";
import { getConfirmationsForBatch, getVerificationEvents } from "@/lib/v2/podStore";
import { getShipmentBatchById, getShipmentBatchesForOrder } from "@/lib/v2/shipmentBatchStore";
import { runV2Migration } from "@/lib/v2/seed/migrate";
import {
  createBatchFromAllocations,
  dispatchBatch,
  generateBatchDeliveryNote,
  submitBatchPod,
  verifyBatchPod,
} from "@/lib/v2/workflows";

const adminCommand = (key: string): CommandMetadata => ({
  actorUserId: "test-admin",
  actorRole: "ADMIN",
  idempotencyKey: key,
});

const admin = { userId: "test-admin", role: "ADMIN" as const };
const vendor = { userId: "test-vendor", role: "VENDOR" as const };

describe("V2 stores and workflows (P4-08..P4-15)", () => {
  beforeAll(() => {
    runV2Migration();
  });

  it("migration is idempotent and seeds every aggregate (P4-15)", () => {
    const first = runV2Migration();
    const second = runV2Migration();
    expect(second.orderRequestCount).toBe(first.orderRequestCount);
    expect(second.allocationCount).toBe(first.allocationCount);
    expect(second.shipmentBatchCount).toBe(first.shipmentBatchCount);
    expect(second.noOp).toBe(true);
    expect(first.orderRequestCount).toBeGreaterThan(0);
    expect(first.salesPointCount).toBeGreaterThan(0);
    expect(first.compatibilityBatchCount).toBeGreaterThan(0);
  });

  it("runs the full partial-shipment lifecycle: batch -> DN -> dispatch -> POD -> verify (P4-08/P4-10)", () => {
    // Find an order with an unshipped allocation and production headroom.
    const order = getOrderRequests().find((entry) => {
      const allocations = getAllocationsForOrder(entry.id);
      return (
        !entry.cancelledAt &&
        allocations.some((allocation) => allocation.shippedQuantity === 0 && allocation.allocatedQuantity >= 10) &&
        getShipmentBatchesForOrder(entry.id).length === 0
      );
    });
    expect(order).toBeDefined();
    if (!order) return;

    const allocation = getAllocationsForOrder(order.id).find(
      (entry) => entry.shippedQuantity === 0 && entry.allocatedQuantity >= 10,
    )!;

    // Walk the legitimate production chain to READY_FOR_DISTRIBUTION (P4-05).
    let job = getProductionJobsForOrder(order.id).find((entry) => entry.orderItemId === allocation.orderItemId)!;
    const chain: Array<typeof job.status> = [
      "SUBMITTED",
      "ACCEPTED",
      "PRINTING",
      "FINISHING",
      "QUALITY_CONTROL",
      "READY_FOR_DISTRIBUTION",
    ];
    for (const nextStatus of chain) {
      job = getProductionJobsForOrder(order.id).find((entry) => entry.id === job.id)!;
      if (chain.indexOf(nextStatus) < chain.indexOf(job.status as (typeof chain)[number])) continue;
      if (job.status === nextStatus) continue;
      if (nextStatus === "ACCEPTED" && job.status === "SUBMITTED") {
        acceptProductionJob(
          { productionJobId: job.id, expectedVersion: job.version, acceptedByUserId: "test-admin" },
          adminCommand(`accept-${job.id}`),
        );
        continue;
      }
      updateProductionProgress(
        {
          productionJobId: job.id,
          expectedVersion: job.version,
          status: nextStatus,
          producedQuantity: job.orderedQuantity,
          completedQuantity: nextStatus === "READY_FOR_DISTRIBUTION" ? job.orderedQuantity : job.completedQuantity,
        },
        adminCommand(`progress-${job.id}-${nextStatus}`),
      );
    }

    // Partial shipment: half the allocation.
    const half = Math.floor(allocation.allocatedQuantity / 2);
    const batch = createBatchFromAllocations(
      {
        orderRequestId: order.id,
        lines: [{ allocationId: allocation.id, quantity: half }],
        generateDeliveryNote: true,
        markReady: true,
      },
      admin,
    );

    expect(batch.items[0].shippedQuantity).toBe(half);
    expect(batch.items[0].outstandingAfterBatchQuantity).toBe(allocation.allocatedQuantity - half);

    // One active DN per batch; second generation without regenerate flag fails.
    const note = getActiveDeliveryNoteForBatch(batch.id);
    expect(note).toBeDefined();
    expect(() => generateBatchDeliveryNote(batch.id, admin)).toThrow();

    // DN regeneration supersedes the predecessor (P4-09).
    const regenerated = generateBatchDeliveryNote(batch.id, admin, {
      regenerate: true,
      regenerationReason: "Destination contact corrected",
    });
    expect(regenerated.deliveryNote.documentVersion).toBe((note?.documentVersion ?? 0) + 1);
    expect(getDeliveryNotesForOrder(order.id).some((entry) => entry.status === "SUPERSEDED")).toBe(true);

    // Dispatch and submit POD with a shortage of 1.
    dispatchBatch(batch.id, admin);
    const dispatched = getShipmentBatchById(batch.id)!;
    expect(dispatched.status).toBe("DISPATCHED");

    const claimed = half - 1;
    submitBatchPod(
      {
        shipmentBatchId: batch.id,
        salesPointId: batch.items[0].salesPoint.salesPointId,
        receiverName: "Test Receiver",
        receivedDate: "2026-06-10",
        evidence: [
          { fileName: "signed.pdf", mimeType: "application/pdf", sizeBytes: 100, storageKey: "pod/test/signed.pdf" },
        ],
        itemConfirmations: [
          { shipmentBatchItemId: batch.items[0].id, claimedReceivedQuantity: claimed, condition: "PARTIALLY_DAMAGED" },
        ],
      },
      vendor,
    );

    const confirmation = getConfirmationsForBatch(batch.id).at(-1)!;
    expect(confirmation.status).toBe("SUBMITTED");

    // Admin verifies; verified quantities apply to batch + allocation caches.
    verifyBatchPod(
      {
        deliveryConfirmationId: confirmation.id,
        decision: "VERIFY",
        itemVerifications: confirmation.itemConfirmations.map((item) => ({
          deliveryConfirmationItemId: item.id,
          verifiedReceivedQuantity: claimed,
        })),
      },
      admin,
    );

    const verifiedBatch = getShipmentBatchById(batch.id)!;
    expect(verifiedBatch.items[0].verifiedReceivedQuantity).toBe(claimed);
    expect(verifiedBatch.quantitySummary.varianceQuantity).toBe(-1);

    const hydratedAllocation = getAllocationsForOrder(order.id).find((entry) => entry.id === allocation.id)!;
    expect(hydratedAllocation.shippedQuantity).toBe(half);
    expect(hydratedAllocation.receivedQuantity).toBe(claimed);

    // Verification events are recorded and idempotent per key (CR-06).
    const events = getVerificationEvents().filter((event) => event.deliveryConfirmationId === confirmation.id);
    expect(events.length).toBe(1);
  });

  it("rejects batch quantities above outstanding allocation (P4-08)", () => {
    const order = getOrderRequests().find((entry) => getAllocationsForOrder(entry.id).length > 0 && !entry.cancelledAt)!;
    const allocation = getAllocationsForOrder(order.id)[0];

    expect(() =>
      createBatchFromAllocations(
        {
          orderRequestId: order.id,
          lines: [{ allocationId: allocation.id, quantity: allocation.allocatedQuantity + 999 }],
        },
        admin,
      ),
    ).toThrow(ApiCommandError);
  });

  it("rejects stale expectedVersion with a contract conflict error (P4-13)", () => {
    const order = getOrderRequests()[0];
    const job = getProductionJobsForOrder(order.id)[0];
    if (!job) return;

    try {
      updateProductionProgress(
        {
          productionJobId: job.id,
          expectedVersion: job.version + 99,
          status: job.status,
          producedQuantity: job.producedQuantity,
        },
        adminCommand(`stale-${job.id}`),
      );
      expect.unreachable("expected VERSION_CONFLICT");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiCommandError);
      expect((error as ApiCommandError).apiError.code).toBe("VERSION_CONFLICT");
      expect((error as ApiCommandError).apiError.conflict?.actualVersion).toBe(job.version);
    }
  });

  it("dedupes duplicate idempotency keys as a no-op (P4-13)", () => {
    const order = getOrderRequests()[0];
    const job = getProductionJobsForOrder(order.id)[0];
    if (!job) return;

    const command = adminCommand(`idem-${job.id}-${Date.now()}`);
    const first = updateProductionProgress(
      {
        productionJobId: job.id,
        expectedVersion: job.version,
        status: job.status,
        producedQuantity: job.producedQuantity,
      },
      command,
    );
    // Replay with the same key: must return the original response, not re-apply.
    const second = updateProductionProgress(
      {
        productionJobId: job.id,
        expectedVersion: job.version, // would now be stale if re-executed
        status: job.status,
        producedQuantity: job.producedQuantity,
      },
      command,
    );
    expect(second.version).toBe(first.version);
    expect(second.auditEventIds).toEqual(first.auditEventIds);
  });
});
