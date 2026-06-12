/**
 * P1-21 — Idempotent localStorage migration with manifest (CR-09).
 *
 * Rules:
 * - `va-trace-orders` is read-only input; it is never modified or deleted.
 * - V2 keys are populated from the seed builders only when empty.
 * - Re-running is a no-op (the manifest records every run with a fingerprint).
 * - Reverse migration is read-only: it produces a legacy-shaped view without
 *   writing anything back.
 */

import { getOrdersSnapshot } from "@/lib/orderStore";
import { checksum, nowIso } from "@/lib/v2/ids";
import { createLocalRepository } from "@/lib/v2/localRepository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
// Importing the stores materializes their seeds on first read.
import { getAllocations } from "@/lib/v2/allocationStore";
import { getDeliveryNotes } from "@/lib/v2/deliveryNoteStore";
import { getOrderRequests } from "@/lib/v2/orderRequestStore";
import { getDeliveryConfirmations } from "@/lib/v2/podStore";
import { getProductionJobs } from "@/lib/v2/productionStore";
import { getSalesPoints } from "@/lib/v2/salesPointStore";
import { getShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { resolveWorkflowPolicy } from "@/lib/v2/policyStore";

export interface MigrationRun {
  runAt: string;
  migrationVersion: number;
  legacyFingerprint: string;
  legacyOrderCount: number;
  orderRequestCount: number;
  allocationCount: number;
  shipmentBatchCount: number;
  compatibilityBatchCount: number;
  deliveryNoteCount: number;
  deliveryConfirmationCount: number;
  salesPointCount: number;
  noOp: boolean;
}

export interface MigrationManifest {
  migrationVersion: number;
  runs: MigrationRun[];
}

const MIGRATION_VERSION = 1;

const manifestRepository = createLocalRepository<MigrationManifest>({
  storageKey: "va-trace-v2-migration-manifest",
  seed: () => ({ migrationVersion: MIGRATION_VERSION, runs: [] }),
});

function legacyFingerprint(): { fingerprint: string; orderCount: number } {
  const orders = getOrdersSnapshot();
  return {
    fingerprint: checksum(orders.map((order) => `${order.id}:${order.items.length}`).join("|")),
    orderCount: orders.length,
  };
}

export function getMigrationManifest(): MigrationManifest {
  return manifestRepository.getSnapshot();
}

/**
 * Materializes every V2 store from the seed builders (idempotent) and records
 * a manifest run. Returns the run record.
 */
export function runV2Migration(): MigrationRun {
  const { fingerprint, orderCount } = legacyFingerprint();
  const manifest = manifestRepository.getSnapshot();
  const previousRun = manifest.runs.at(-1);
  const noOp = previousRun?.legacyFingerprint === fingerprint;

  // Build (or reuse cached) seed data, then touch every store so empty keys
  // self-seed. Stores that already hold data are left untouched (idempotency).
  buildV2SeedData();
  resolveWorkflowPolicy();

  const run: MigrationRun = {
    runAt: nowIso(),
    migrationVersion: MIGRATION_VERSION,
    legacyFingerprint: fingerprint,
    legacyOrderCount: orderCount,
    orderRequestCount: getOrderRequests().length,
    allocationCount: getAllocations().length,
    shipmentBatchCount: getShipmentBatches().length,
    compatibilityBatchCount: getShipmentBatches().filter((batch) => batch.compatibilitySource === "LEGACY_MIGRATION").length,
    deliveryNoteCount: getDeliveryNotes().length,
    deliveryConfirmationCount: getDeliveryConfirmations().length,
    salesPointCount: getSalesPoints().length,
    noOp,
  };

  manifestRepository.update((current) => ({
    migrationVersion: MIGRATION_VERSION,
    runs: [...current.runs.slice(-19), run],
  }));

  return run;
}

/**
 * Read-only reverse migration (CR-09): produces a legacy-shaped summary of the
 * current V2 state for rollback verification. Never writes to legacy keys.
 */
export function buildLegacyCompatibilityView(): Array<{
  id: string;
  status: string;
  productionStatus: string;
  distributionStatus: string;
  shipmentBatchIds: string[];
  deliveryNoteNumbers: string[];
}> {
  const batches = getShipmentBatches();
  const notes = getDeliveryNotes();
  return getOrderRequests().map((order) => ({
    id: order.id,
    status: order.legacyStatusLabel ?? "New",
    productionStatus: order.productionStatus,
    distributionStatus: order.distributionStatus,
    shipmentBatchIds: batches.filter((batch) => batch.orderRequestId === order.id).map((batch) => batch.id),
    deliveryNoteNumbers: notes
      .filter((note) => note.orderRequestId === order.id && note.isActive)
      .map((note) => note.deliveryNoteNumber),
  }));
}

// Re-export so callers can verify production job materialization in tests.
export { getProductionJobs };
