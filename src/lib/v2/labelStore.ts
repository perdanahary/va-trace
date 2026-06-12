/**
 * P1-14 — Shipping package and label store (CR-03).
 * Storage key: `va-trace-v2-labels`.
 *
 * Labels belong to packages; packages belong to shipment batch items.
 * Printing is recorded as an event, not only a status.
 */

import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import type {
  RecordShippingLabelPrintDto,
  ShipmentBatch,
  ShippingLabel,
  ShippingLabelPrintEvent,
  ShippingPackage,
  VoidShippingLabelDto,
} from "@/lib/types/v2/shipment";
import { checksum, newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";

interface LabelState {
  id: ID;
  packages: ShippingPackage[];
  labels: ShippingLabel[];
  printEvents: ShippingLabelPrintEvent[];
}

const store = createCollectionStore<LabelState>({
  storageKey: "va-trace-v2-labels",
  entityType: "SHIPPING_LABEL",
  seed: () => [{ id: "label-state", packages: [], labels: [], printEvents: [] }],
});

function getState(): LabelState {
  return store.getAll()[0] ?? { id: "label-state", packages: [], labels: [], printEvents: [] };
}

function setState(next: LabelState): void {
  store.replaceAll([next]);
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useLabelState(): LabelState {
  return store.useAll()[0] ?? { id: "label-state", packages: [], labels: [], printEvents: [] };
}

export function getLabelsForBatch(shipmentBatchId: ID): ShippingLabel[] {
  return getState().labels.filter((label) => label.shipmentBatchId === shipmentBatchId);
}

export function getAllLabels(): ShippingLabel[] {
  return getState().labels;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Generates one package + label per batch item (default PACKAGE label plan). */
export function generateLabelsForBatch(
  batch: ShipmentBatch,
  command: CommandMetadata,
): MutationResponse<ShippingLabel[]> {
  const response = runCommand<{ labels: ShippingLabel[]; version: number }>({
    command,
    execute: (context) => {
      if (batch.items.length === 0) {
        throw validationError("Cannot generate labels for a batch without items.");
      }

      const state = getState();
      const existingActive = state.labels.filter(
        (label) => label.shipmentBatchId === batch.id && label.status !== "VOIDED" && label.status !== "SUPERSEDED",
      );
      if (existingActive.length > 0) {
        return { labels: existingActive, version: 1 };
      }

      const now = nowIso();
      const packages: ShippingPackage[] = [];
      const labels: ShippingLabel[] = [];

      batch.items.forEach((item, index) => {
        const packageId = newId("pkg");
        const labelId = newId("label");
        const packageNumber = `PKG-${batch.batchNumber}-${String(index + 1).padStart(3, "0")}`;
        const labelNumber = `LBL-${batch.batchNumber}-${String(index + 1).padStart(3, "0")}`;
        const destination = batch.destinationSnapshots.find(
          (snapshot) => snapshot.salesPointId === item.salesPoint.salesPointId,
        );

        packages.push({
          id: packageId,
          shipmentBatchId: batch.id,
          packageNumber,
          salesPointId: item.salesPoint.salesPointId,
          shipmentBatchItemIds: [item.id],
          quantityByItem: [
            {
              shipmentBatchItemId: item.id,
              orderItemId: item.orderItemId,
              productId: item.product.productId,
              quantity: item.shippedQuantity,
            },
          ],
          labelIds: [labelId],
          status: "LABELLED",
          snapshotVersion: destination?.snapshotVersion ?? 1,
          audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
          version: 1,
        });

        labels.push({
          id: labelId,
          labelNumber,
          shipmentBatchId: batch.id,
          shippingPackageId: packageId,
          salesPointId: item.salesPoint.salesPointId,
          deliveryNoteId: batch.deliveryNoteId,
          type: "PACKAGE",
          status: "GENERATED",
          qrPayload: {
            labelNumber,
            shipmentBatchId: batch.id,
            shippingPackageId: packageId,
            salesPointId: item.salesPoint.salesPointId,
            checksum: checksum(`${labelNumber}:${batch.id}:${packageId}`),
          },
          printCount: 0,
          productCode: item.product.materialCode,
          productName: item.product.name,
          quantity: item.shippedQuantity,
          unitOfMeasure: item.product.unitOfMeasure,
          destinationName: destination?.salesPointName ?? item.salesPoint.name,
          destinationAddress: destination?.address ?? "",
          projectName: batch.project.name,
          audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
          version: 1,
        });
      });

      setState({
        ...state,
        packages: [...packages, ...state.packages],
        labels: [...labels, ...state.labels],
      });

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "SHIPPING_LABEL",
        sourceEntityId: batch.id,
        newValue: { labelCount: labels.length },
      });
      context.sideEffect({
        type: "CREATED",
        entityType: "SHIPPING_LABEL",
        entityId: batch.id,
        description: `${labels.length} shipping label(s) generated for ${batch.batchNumber}.`,
      });

      return { labels, version: 1 };
    },
  });

  return { ...response, data: response.data.labels };
}

export function recordLabelPrint(
  dto: RecordShippingLabelPrintDto,
  command: CommandMetadata,
): MutationResponse<ShippingLabel[]> {
  const response = runCommand<{ labels: ShippingLabel[]; version: number }>({
    command,
    execute: (context) => {
      const state = getState();
      const now = nowIso();
      const printed: ShippingLabel[] = [];
      const printEvents: ShippingLabelPrintEvent[] = [];

      const labels = state.labels.map((label) => {
        if (!dto.shippingLabelIds.includes(label.id)) return label;
        if (label.status === "VOIDED" || label.status === "SUPERSEDED") {
          throw invalidTransitionError(`Label ${label.labelNumber} is ${label.status} and cannot be printed.`);
        }
        const next: ShippingLabel = {
          ...label,
          status: label.printCount > 0 ? "REPRINTED" : "PRINTED",
          printCount: label.printCount + 1,
          lastPrintedAt: now,
          audit: { ...label.audit, updatedAt: now, updatedBy: command.actorUserId },
          version: label.version + 1,
        };
        printed.push(next);
        printEvents.push({
          id: newId("lpe"),
          shippingLabelId: label.id,
          printedAt: now,
          printedBy: command.actorUserId,
          printStatus: "PRINTED",
          printerName: dto.printerName,
        });
        return next;
      });

      if (printed.length === 0) {
        throw notFoundError("SHIPPING_LABEL", dto.shippingLabelIds[0] ?? "unknown");
      }

      setState({ ...state, labels, printEvents: [...printEvents, ...state.printEvents] });

      context.audit({
        eventType: "PRINTED",
        sourceEntityType: "SHIPPING_LABEL",
        sourceEntityId: printed[0].shipmentBatchId,
        newValue: { labelIds: printed.map((label) => label.id) },
      });
      context.domainEvent({
        eventType: "SHIPPING_LABEL_PRINTED",
        aggregateType: "SHIPPING_LABEL",
        aggregateId: printed[0].id,
        payload: { labelIds: printed.map((label) => label.id) },
      });

      return { labels: printed, version: 1 };
    },
  });

  return { ...response, data: response.data.labels };
}

export function voidLabel(dto: VoidShippingLabelDto, command: CommandMetadata): MutationResponse<ShippingLabel> {
  return runCommand({
    command,
    execute: (context) => {
      const state = getState();
      const label = state.labels.find((entry) => entry.id === dto.shippingLabelId);
      if (!label) throw notFoundError("SHIPPING_LABEL", dto.shippingLabelId);
      assertVersion(label, dto.expectedVersion, "SHIPPING_LABEL");
      if (label.status === "VOIDED") throw invalidTransitionError("Label is already voided.");

      const next: ShippingLabel = {
        ...label,
        status: "VOIDED",
        voidedAt: nowIso(),
        voidReason: dto.reason,
        audit: { ...label.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: label.version + 1,
      };

      setState({
        ...state,
        labels: state.labels.map((entry) => (entry.id === label.id ? next : entry)),
      });

      context.audit({
        eventType: "VOIDED",
        sourceEntityType: "SHIPPING_LABEL",
        sourceEntityId: label.id,
        previousValue: label.status,
        newValue: "VOIDED",
        reason: dto.reason,
      });

      return next;
    },
  });
}
