/**
 * P1-15 — Delivery Note store.
 * Storage key: `va-trace-v2-dns`.
 *
 * Owns batch-scoped `DeliveryNote` records with versioning/supersession
 * (HI-07): one ACTIVE DN per Shipment Batch; regeneration increments
 * `documentVersion`, marks the predecessor `SUPERSEDED`, and requires a reason.
 * DN items are always sourced from Shipment Batch items, never order totals.
 */

import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import type {
  DeliveryNote,
  DeliveryNoteItem,
  GenerateDeliveryNoteDto,
  RecordDeliveryNotePrintDto,
  UploadSignedDeliveryNoteDto,
  VoidDeliveryNoteDto,
} from "@/lib/types/v2/deliveryNote";
import type { ShipmentBatch } from "@/lib/types/v2/shipment";
import type { DeliveryNoteStatus } from "@/lib/types/v2/status";
import { checksum, newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  policyBlockedError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { resolveWorkflowPolicy } from "@/lib/v2/policyStore";

const store = createCollectionStore<DeliveryNote>({
  storageKey: "va-trace-v2-dns",
  entityType: "DELIVERY_NOTE",
  seed: () => buildV2SeedData().deliveryNotes,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useDeliveryNotes(): DeliveryNote[] {
  return store.useAll();
}

export function getDeliveryNotes(): DeliveryNote[] {
  return store.getAll();
}

export function getDeliveryNoteById(id: ID): DeliveryNote | undefined {
  return store.getById(id) ?? store.getAll().find((note) => note.deliveryNoteNumber === id);
}

export function getActiveDeliveryNoteForBatch(shipmentBatchId: ID): DeliveryNote | undefined {
  return store.getAll().find((note) => note.shipmentBatchId === shipmentBatchId && note.isActive);
}

export function getDeliveryNotesForOrder(orderRequestId: ID): DeliveryNote[] {
  return store.getAll().filter((note) => note.orderRequestId === orderRequestId);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

let dnSequence = 0;

function nextDeliveryNoteNumber(): string {
  dnSequence += 1;
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `DEL${datePart}${String(store.getAll().length + dnSequence).padStart(4, "0")}`;
}

function buildItems(noteId: ID, batch: ShipmentBatch, orderItemLineNumbers: Map<ID, number>): DeliveryNoteItem[] {
  return batch.items.map((item, index) => ({
    id: `${noteId}-line-${index + 1}`,
    deliveryNoteId: noteId,
    shipmentBatchItemId: item.id,
    orderItemId: item.orderItemId,
    salesPointAllocationId: item.salesPointAllocationId,
    poLineNumber: orderItemLineNumbers.get(item.orderItemId) ?? index + 1,
    salesPointId: item.salesPoint.salesPointId,
    salesPointCode: item.salesPoint.code,
    salesPointName: item.salesPoint.name,
    materialCode: item.product.materialCode,
    sku: item.product.sku,
    description: item.product.name,
    specification: item.product.specification,
    orderedQuantity: item.allocatedQuantity,
    allocatedQuantity: item.allocatedQuantity,
    previouslyShippedQuantity: item.previouslyShippedQuantity,
    shippedQuantity: item.shippedQuantity,
    outstandingQuantityAfterShipment: item.outstandingAfterBatchQuantity,
    unitOfMeasure: item.product.unitOfMeasure,
    remarks: item.remarks,
  }));
}

export function generateDeliveryNote(
  dto: GenerateDeliveryNoteDto,
  batch: ShipmentBatch,
  options: { orderItemLineNumbers: Map<ID, number>; senderName: string; senderAddress?: string },
  command: CommandMetadata,
): MutationResponse<DeliveryNote> {
  return runCommand({
    command,
    execute: (context) => {
      if (batch.items.length === 0) {
        throw validationError("Delivery Note generation is blocked: the batch has no shipment items.");
      }

      const policy = resolveWorkflowPolicy({
        clientId: batch.client.id,
        projectId: batch.project.id,
        vendorId: batch.vendor.id,
      });
      const existingActive = getActiveDeliveryNoteForBatch(batch.id);

      if (existingActive && !dto.regenerate) {
        if (policy.documentRules.oneActiveDeliveryNotePerBatch) {
          throw validationError(
            `Batch ${batch.batchNumber} already has an active Delivery Note (${existingActive.deliveryNoteNumber}).`,
          );
        }
      }
      if (dto.regenerate) {
        if (!dto.regenerationReason) {
          throw validationError("Regeneration requires a reason.");
        }
        if (command.actorRole === "VENDOR" && !policy.documentRules.allowVendorRegenerateDeliveryNote) {
          throw policyBlockedError("Vendor regeneration of Delivery Notes is blocked by policy.");
        }
      }

      const now = nowIso();
      const id = newId("dn");
      const deliveryNoteNumber = nextDeliveryNoteNumber();
      const items = buildItems(id, batch, options.orderItemLineNumbers);

      const note: DeliveryNote = {
        id,
        deliveryNoteNumber,
        shipmentBatchId: batch.id,
        batchNumber: batch.batchNumber,
        orderRequestId: batch.orderRequestId,
        orderRequestNumber: batch.orderRequestNumber,
        clientPoNumber: batch.clientPoNumber,
        projectName: batch.project.name,
        client: { id: batch.client.id, name: batch.client.name },
        vendor: { id: batch.vendor.id, name: batch.vendor.name },
        senderSnapshot: { name: options.senderName, address: options.senderAddress },
        destinationSnapshots: batch.destinationSnapshots.map((destination) => ({
          salesPointId: destination.salesPointId,
          salesPointCode: destination.salesPointCode,
          wCode: destination.wCode,
          salesPointName: destination.salesPointName,
          zone: destination.zone,
          region: destination.region,
          area: destination.area,
          subArea: destination.subArea,
          address: destination.address,
          deliveryInstructions: destination.deliveryInstructions,
          contacts: destination.contacts.map((contact) => ({
            name: contact.name,
            role: contact.role,
            phone: contact.phone,
            email: contact.email,
            isPrimary: contact.isPrimary,
          })),
          snapshotVersion: destination.snapshotVersion,
        })),
        status: "GENERATED",
        documentVersion: (existingActive?.documentVersion ?? 0) + 1,
        isActive: true,
        supersedesDeliveryNoteId: dto.regenerate ? existingActive?.id : undefined,
        regenerationReason: dto.regenerate ? dto.regenerationReason : undefined,
        generatedAt: now,
        generatedByUserId: command.actorUserId,
        printCount: 0,
        qrPayload: {
          deliveryNoteId: id,
          deliveryNoteNumber,
          shipmentBatchId: batch.id,
          batchNumber: batch.batchNumber,
          orderRequestId: batch.orderRequestId,
          generatedAt: now,
          checksum: checksum(`${deliveryNoteNumber}:${batch.id}`),
        },
        items,
        signatureFields: {
          receiverSignatureRequired: true,
          receiverStampRequired: true,
          receivedDateRequired: true,
        },
        documentFiles: [],
        quantitySummary: {
          salesPointCount: batch.destinationSnapshots.length,
          itemCount: items.length,
          orderedContextQuantity: items.reduce((total, line) => total + line.orderedQuantity, 0),
          allocatedContextQuantity: items.reduce((total, line) => total + line.allocatedQuantity, 0),
          shippedQuantity: items.reduce((total, line) => total + line.shippedQuantity, 0),
          outstandingQuantityAfterShipment: items.reduce(
            (total, line) => total + line.outstandingQuantityAfterShipment,
            0,
          ),
        },
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      };

      if (dto.regenerate && existingActive) {
        store.upsert({
          ...existingActive,
          status: "SUPERSEDED",
          isActive: false,
          audit: { ...existingActive.audit, updatedAt: now, updatedBy: command.actorUserId },
          version: existingActive.version + 1,
        });
        context.audit({
          eventType: "REGENERATED",
          sourceEntityType: "DELIVERY_NOTE",
          sourceEntityId: existingActive.id,
          newValue: { supersededBy: note.id },
          reason: dto.regenerationReason,
        });
      }

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "DELIVERY_NOTE",
        sourceEntityId: note.id,
        newValue: { deliveryNoteNumber, shipmentBatchId: batch.id, documentVersion: note.documentVersion },
      });
      context.domainEvent({
        eventType: "DELIVERY_NOTE_GENERATED",
        aggregateType: "DELIVERY_NOTE",
        aggregateId: note.id,
        payload: { deliveryNoteNumber, shipmentBatchId: batch.id },
      });

      store.upsert(note);
      return note;
    },
  });
}

export function recordDeliveryNotePrint(
  dto: RecordDeliveryNotePrintDto,
  command: CommandMetadata,
): MutationResponse<DeliveryNote> {
  return runCommand({
    command,
    execute: (context) => {
      const note = store.getById(dto.deliveryNoteId);
      if (!note) throw notFoundError("DELIVERY_NOTE", dto.deliveryNoteId);
      assertVersion(note, dto.expectedVersion, "DELIVERY_NOTE");
      if (!note.isActive || note.status === "VOIDED") {
        throw invalidTransitionError("Only the active Delivery Note can be printed.");
      }

      const next: DeliveryNote = {
        ...note,
        status: note.status === "GENERATED" ? "PRINTED" : note.status,
        printedAt: note.printedAt ?? dto.printedAt,
        lastPrintedAt: dto.printedAt,
        printCount: note.printCount + 1,
        audit: { ...note.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: note.version + 1,
      };

      context.audit({
        eventType: "PRINTED",
        sourceEntityType: "DELIVERY_NOTE",
        sourceEntityId: note.id,
        newValue: { printCount: next.printCount },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function uploadSignedDeliveryNote(
  dto: UploadSignedDeliveryNoteDto,
  fileAssetId: ID,
  command: CommandMetadata,
): MutationResponse<DeliveryNote> {
  return runCommand({
    command,
    execute: (context) => {
      const note = store.getById(dto.deliveryNoteId);
      if (!note) throw notFoundError("DELIVERY_NOTE", dto.deliveryNoteId);
      assertVersion(note, dto.expectedVersion, "DELIVERY_NOTE");
      if (note.shipmentBatchId !== dto.shipmentBatchId) {
        throw validationError("Uploaded signed DN does not correspond to the batch being verified.");
      }

      const now = nowIso();
      const next: DeliveryNote = {
        ...note,
        status: "UPLOADED",
        signedAt: dto.signedAt ?? note.signedAt,
        uploadedAt: now,
        documentFiles: [
          ...note.documentFiles,
          {
            id: fileAssetId,
            type: "SIGNED_SCAN",
            fileName: dto.file.fileName,
            mimeType: dto.file.mimeType,
            sizeBytes: dto.file.sizeBytes,
            storageKey: dto.file.storageKey,
            uploadedAt: now,
            uploadedByUserId: command.actorUserId,
          },
        ],
        audit: { ...note.audit, updatedAt: now, updatedBy: command.actorUserId },
        version: note.version + 1,
      };

      context.audit({
        eventType: "FILE_UPLOADED",
        sourceEntityType: "DELIVERY_NOTE",
        sourceEntityId: note.id,
        newValue: { fileName: dto.file.fileName },
      });

      store.upsert(next);
      return next;
    },
  });
}

/** Advances DN document status from the POD workflow (UPLOADED -> VERIFIED -> CLOSED). */
export function setDeliveryNoteStatus(
  deliveryNoteId: ID,
  status: DeliveryNoteStatus,
  command: CommandMetadata,
): MutationResponse<DeliveryNote> {
  return runCommand({
    command,
    execute: (context) => {
      const note = store.getById(deliveryNoteId);
      if (!note) throw notFoundError("DELIVERY_NOTE", deliveryNoteId);

      const now = nowIso();
      const next: DeliveryNote = {
        ...note,
        status,
        verifiedAt: status === "VERIFIED" ? now : note.verifiedAt,
        closedAt: status === "CLOSED" ? now : note.closedAt,
        audit: { ...note.audit, updatedAt: now, updatedBy: command.actorUserId },
        version: note.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "DELIVERY_NOTE",
        sourceEntityId: note.id,
        previousValue: note.status,
        newValue: status,
      });

      store.upsert(next);
      return next;
    },
  });
}

export function voidDeliveryNote(dto: VoidDeliveryNoteDto, command: CommandMetadata): MutationResponse<DeliveryNote> {
  return runCommand({
    command,
    execute: (context) => {
      const note = store.getById(dto.deliveryNoteId);
      if (!note) throw notFoundError("DELIVERY_NOTE", dto.deliveryNoteId);
      assertVersion(note, dto.expectedVersion, "DELIVERY_NOTE");
      if (!dto.reason) throw validationError("Void reason is required.");
      if (command.actorRole !== "ADMIN") {
        throw policyBlockedError("Voiding a Delivery Note requires Admin.");
      }

      const next: DeliveryNote = {
        ...note,
        status: "VOIDED",
        isActive: false,
        voidReason: dto.reason,
        audit: { ...note.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: note.version + 1,
      };

      context.audit({
        eventType: "VOIDED",
        sourceEntityType: "DELIVERY_NOTE",
        sourceEntityId: note.id,
        previousValue: note.status,
        newValue: "VOIDED",
        reason: dto.reason,
      });

      store.upsert(next);
      return next;
    },
  });
}
