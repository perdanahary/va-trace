/**
 * P1-15 — Delivery Confirmation (POD) store (CR-06).
 * Storage key: `va-trace-v2-pod`.
 *
 * Owns `DeliveryConfirmation` with immutable attempt history and
 * `PodVerificationEvent` records. Verification is idempotent (one application
 * per idempotency key) and reversible only through `reverseVerification`.
 * Verified quantities are applied to batches by the POD workflow, never here.
 */

import type {
  CreateDeliveryConfirmationDto,
  DeliveryConfirmation,
  DeliveryConfirmationAttempt,
  DeliveryConfirmationItem,
  PodVerificationEvent,
  ReverseVerificationDto,
  VerifyDeliveryConfirmationDto,
} from "@/lib/types/v2/deliveryNote";
import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import type { ShipmentBatch } from "@/lib/types/v2/shipment";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  invalidTransitionError,
  notFoundError,
  permissionDeniedError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { resolveWorkflowPolicy } from "@/lib/v2/policyStore";

const store = createCollectionStore<DeliveryConfirmation>({
  storageKey: "va-trace-v2-pod",
  entityType: "DELIVERY_CONFIRMATION",
  seed: () => buildV2SeedData().deliveryConfirmations,
});

const verificationEventStore = createCollectionStore<PodVerificationEvent>({
  storageKey: "va-trace-v2-pod-verification-events",
  entityType: "DELIVERY_CONFIRMATION",
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useDeliveryConfirmations(): DeliveryConfirmation[] {
  return store.useAll();
}

export function getDeliveryConfirmations(): DeliveryConfirmation[] {
  return store.getAll();
}

export function getDeliveryConfirmationById(id: ID): DeliveryConfirmation | undefined {
  return store.getById(id);
}

export function getConfirmationsForBatch(shipmentBatchId: ID): DeliveryConfirmation[] {
  return store.getAll().filter((confirmation) => confirmation.shipmentBatchId === shipmentBatchId);
}

export function getVerificationEvents(): PodVerificationEvent[] {
  return verificationEventStore.getAll();
}

// ---------------------------------------------------------------------------
// Submission (Vendor)
// ---------------------------------------------------------------------------

function buildQuantitySummary(items: DeliveryConfirmationItem[]): DeliveryConfirmation["quantitySummary"] {
  const expected = items.reduce((total, item) => total + item.expectedShippedQuantity, 0);
  const claimed = items.reduce((total, item) => total + item.claimedReceivedQuantity, 0);
  const verified = items.reduce((total, item) => total + (item.verifiedReceivedQuantity ?? 0), 0);
  return {
    expectedShippedQuantity: expected,
    claimedReceivedQuantity: claimed,
    verifiedReceivedQuantity: verified,
    varianceQuantity: claimed - expected,
    hasPartialDelivery: claimed < expected,
  };
}

export function submitPod(
  dto: CreateDeliveryConfirmationDto,
  batch: ShipmentBatch,
  evidenceFileAssetIds: ID[],
  command: CommandMetadata,
): MutationResponse<DeliveryConfirmation> {
  return runCommand({
    command,
    execute: (context) => {
      if (command.actorRole !== "VENDOR" && command.actorRole !== "ADMIN") {
        throw permissionDeniedError("pod:upload", "Only the assigned Vendor can submit POD evidence.");
      }
      if (!dto.receiverName) throw validationError("Receiver name is required.");
      if (!dto.receivedDate) throw validationError("Received date is required.");
      if (Date.parse(dto.receivedDate) > Date.now() && command.actorRole !== "ADMIN") {
        throw validationError("Received date cannot be in the future.");
      }
      if (dto.itemConfirmations.length === 0) {
        throw validationError("Received quantity is required for each shipment item included in POD.");
      }

      const policy = resolveWorkflowPolicy({
        clientId: batch.client.id,
        projectId: batch.project.id,
        vendorId: batch.vendor.id,
      });
      const hasSignedDn = dto.evidence.some(
        (file) => (file.type ?? "SIGNED_DN") === "SIGNED_DN" || file.mimeType === "application/pdf",
      );
      if (policy.podRules.signedDeliveryNoteRequired && !hasSignedDn) {
        throw validationError("A signed Delivery Note file is required by policy.", [
          { field: "evidence", code: "REQUIRED", message: "Upload the signed Delivery Note." },
        ]);
      }
      if (policy.podRules.photoEvidenceRequired) {
        const photoCount = dto.evidence.filter((file) => file.mimeType.startsWith("image/")).length;
        if (photoCount < (policy.podRules.minPhotoCount ?? 1)) {
          throw validationError("POD photos are required by policy.");
        }
      }

      const batchItemsById = new Map(batch.items.map((item) => [item.id, item]));
      const now = nowIso();
      const confirmationId = newId("pod");

      const itemConfirmations: DeliveryConfirmationItem[] = dto.itemConfirmations.map((entry, index) => {
        const batchItem = batchItemsById.get(entry.shipmentBatchItemId);
        if (!batchItem) {
          throw validationError(`Shipment item ${entry.shipmentBatchItemId} does not belong to batch ${batch.id}.`);
        }
        if (entry.claimedReceivedQuantity < 0) {
          throw validationError("Received quantity cannot be negative.");
        }
        if (entry.claimedReceivedQuantity > batchItem.shippedQuantity && !policy.podRules.allowOverReceipt) {
          context.warn({
            code: "OVERAGE",
            message: `Claimed quantity ${entry.claimedReceivedQuantity} exceeds shipped ${batchItem.shippedQuantity}; Admin overage decision required.`,
            severity: "WARNING",
          });
        }
        return {
          id: `${confirmationId}-item-${index + 1}`,
          deliveryConfirmationId: confirmationId,
          shipmentBatchItemId: batchItem.id,
          salesPointAllocationId: batchItem.salesPointAllocationId,
          materialCode: batchItem.product.materialCode,
          sku: batchItem.product.sku,
          expectedShippedQuantity: batchItem.shippedQuantity,
          claimedReceivedQuantity: entry.claimedReceivedQuantity,
          varianceQuantity: entry.claimedReceivedQuantity - batchItem.shippedQuantity,
          varianceReason: entry.varianceReason,
          condition: entry.condition,
          remarks: entry.remarks,
        };
      });

      const evidence = dto.evidence.map((file, index) => ({
        id: `${confirmationId}-evidence-${index + 1}`,
        type: file.type ?? (file.mimeType.startsWith("image/") ? ("POD_PHOTO" as const) : ("SIGNED_DN" as const)),
        fileAssetId: evidenceFileAssetIds[index] ?? `${confirmationId}-file-${index + 1}`,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        uploadedAt: now,
        uploadedByUserId: command.actorUserId,
      }));

      const attemptId = `${confirmationId}-attempt-1`;
      const attempt: DeliveryConfirmationAttempt = {
        id: attemptId,
        deliveryConfirmationId: confirmationId,
        attemptNumber: 1,
        status: "SUBMITTED",
        submittedAt: now,
        submittedBy: command.actorUserId,
        receiverName: dto.receiverName,
        receiverRole: dto.receiverRole,
        receiverPhone: dto.receiverPhone,
        receivedDate: dto.receivedDate,
        evidence,
        itemConfirmations,
      };

      const confirmation: DeliveryConfirmation = {
        id: confirmationId,
        shipmentBatchId: batch.id,
        deliveryNoteId: dto.deliveryNoteId,
        deliveryNoteNumber: batch.deliveryNoteNumber ?? "",
        orderRequestId: batch.orderRequestId,
        salesPointId: dto.salesPointId,
        salesPointCode:
          batch.destinationSnapshots.find((destination) => destination.salesPointId === dto.salesPointId)
            ?.salesPointCode ?? dto.salesPointId,
        salesPointName:
          batch.destinationSnapshots.find((destination) => destination.salesPointId === dto.salesPointId)
            ?.salesPointName ?? dto.salesPointId,
        status: "SUBMITTED",
        receiverName: dto.receiverName,
        receiverRole: dto.receiverRole,
        receiverPhone: dto.receiverPhone,
        receivedDate: dto.receivedDate,
        submittedByUserId: command.actorUserId,
        submittedAt: now,
        evidence,
        itemConfirmations,
        attempts: [attempt],
        activeAttemptId: attemptId,
        quantitySummary: buildQuantitySummary(itemConfirmations),
        notes: dto.notes,
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      };

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "DELIVERY_CONFIRMATION",
        sourceEntityId: confirmation.id,
        newValue: { shipmentBatchId: batch.id, salesPointId: dto.salesPointId },
      });
      context.domainEvent({
        eventType: "POD_SUBMITTED",
        aggregateType: "DELIVERY_CONFIRMATION",
        aggregateId: confirmation.id,
        payload: { shipmentBatchId: batch.id },
        idempotencyKey: command.idempotencyKey,
      });

      store.upsert(confirmation);
      return confirmation;
    },
  });
}

export function resubmitPod(
  confirmationId: ID,
  dto: Omit<CreateDeliveryConfirmationDto, "shipmentBatchId" | "deliveryNoteId" | "salesPointId">,
  batch: ShipmentBatch,
  evidenceFileAssetIds: ID[],
  expectedVersion: number,
  command: CommandMetadata,
): MutationResponse<DeliveryConfirmation> {
  return runCommand({
    command,
    execute: (context) => {
      const confirmation = store.getById(confirmationId);
      if (!confirmation) throw notFoundError("DELIVERY_CONFIRMATION", confirmationId);
      assertVersion(confirmation, expectedVersion, "DELIVERY_CONFIRMATION");
      if (confirmation.status !== "REJECTED" && confirmation.status !== "CORRECTION_REQUESTED") {
        throw invalidTransitionError(
          `POD ${confirmationId} can be resubmitted only after rejection or correction request.`,
        );
      }

      const batchItemsById = new Map(batch.items.map((item) => [item.id, item]));
      const now = nowIso();
      const attemptNumber = confirmation.attempts.length + 1;
      const attemptId = `${confirmationId}-attempt-${attemptNumber}`;

      const itemConfirmations: DeliveryConfirmationItem[] = dto.itemConfirmations.map((entry, index) => {
        const batchItem = batchItemsById.get(entry.shipmentBatchItemId);
        if (!batchItem) {
          throw validationError(`Shipment item ${entry.shipmentBatchItemId} does not belong to batch ${batch.id}.`);
        }
        if (entry.claimedReceivedQuantity < 0) throw validationError("Received quantity cannot be negative.");
        return {
          id: `${attemptId}-item-${index + 1}`,
          deliveryConfirmationId: confirmationId,
          shipmentBatchItemId: batchItem.id,
          salesPointAllocationId: batchItem.salesPointAllocationId,
          materialCode: batchItem.product.materialCode,
          sku: batchItem.product.sku,
          expectedShippedQuantity: batchItem.shippedQuantity,
          claimedReceivedQuantity: entry.claimedReceivedQuantity,
          varianceQuantity: entry.claimedReceivedQuantity - batchItem.shippedQuantity,
          varianceReason: entry.varianceReason,
          condition: entry.condition,
          remarks: entry.remarks,
        };
      });

      const evidence = dto.evidence.map((file, index) => ({
        id: `${attemptId}-evidence-${index + 1}`,
        type: file.type ?? (file.mimeType.startsWith("image/") ? ("POD_PHOTO" as const) : ("SIGNED_DN" as const)),
        fileAssetId: evidenceFileAssetIds[index] ?? `${attemptId}-file-${index + 1}`,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey: file.storageKey,
        uploadedAt: now,
        uploadedByUserId: command.actorUserId,
      }));

      const previousAttempt = confirmation.attempts.find((attempt) => attempt.id === confirmation.activeAttemptId);
      const attempt: DeliveryConfirmationAttempt = {
        id: attemptId,
        deliveryConfirmationId: confirmationId,
        attemptNumber,
        status: "RESUBMITTED",
        submittedAt: now,
        submittedBy: command.actorUserId,
        receiverName: dto.receiverName,
        receiverRole: dto.receiverRole,
        receiverPhone: dto.receiverPhone,
        receivedDate: dto.receivedDate,
        evidence,
        itemConfirmations,
        supersedesAttemptId: previousAttempt?.id,
      };

      const next: DeliveryConfirmation = {
        ...confirmation,
        status: "RESUBMITTED",
        receiverName: dto.receiverName,
        receivedDate: dto.receivedDate,
        evidence,
        itemConfirmations,
        attempts: [...confirmation.attempts, attempt],
        activeAttemptId: attemptId,
        quantitySummary: buildQuantitySummary(itemConfirmations),
        notes: dto.notes ?? confirmation.notes,
        audit: { ...confirmation.audit, updatedAt: now, updatedBy: command.actorUserId },
        version: confirmation.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "DELIVERY_CONFIRMATION",
        sourceEntityId: confirmationId,
        newValue: { attemptNumber, status: "RESUBMITTED" },
      });

      store.upsert(next);
      return next;
    },
  });
}

// ---------------------------------------------------------------------------
// Verification (Admin)
// ---------------------------------------------------------------------------

export interface VerificationOutcome {
  confirmation: DeliveryConfirmation;
  verificationEvent?: PodVerificationEvent;
}

export function reviewPod(
  dto: VerifyDeliveryConfirmationDto,
  command: CommandMetadata,
): MutationResponse<VerificationOutcome & { version: number }> {
  return runCommand({
    command,
    execute: (context) => {
      if (command.actorRole !== "ADMIN") {
        throw permissionDeniedError("pod:verify", "Only Admin can verify POD evidence.");
      }
      const confirmation = store.getById(dto.deliveryConfirmationId);
      if (!confirmation) throw notFoundError("DELIVERY_CONFIRMATION", dto.deliveryConfirmationId);
      assertVersion(confirmation, dto.expectedVersion, "DELIVERY_CONFIRMATION");
      if (!["SUBMITTED", "PENDING_VERIFICATION", "RESUBMITTED"].includes(confirmation.status)) {
        throw invalidTransitionError(`POD ${confirmation.id} is not awaiting verification (${confirmation.status}).`);
      }
      if ((dto.decision === "REJECT" || dto.decision === "REQUEST_CORRECTION") && !dto.reviewReason) {
        throw validationError("A reason is required to reject or request correction.");
      }

      // CR-06 idempotency: one verification event per idempotency key.
      const existingEvent = verificationEventStore
        .getAll()
        .find((event) => event.idempotencyKey === command.idempotencyKey && !event.reversedByEventId);
      if (existingEvent) {
        return { confirmation, verificationEvent: existingEvent, version: confirmation.version };
      }

      const now = nowIso();
      const verificationById = new Map(dto.itemVerifications.map((entry) => [entry.deliveryConfirmationItemId, entry]));

      let nextStatus: DeliveryConfirmation["status"];
      let verificationEvent: PodVerificationEvent | undefined;
      let itemConfirmations = confirmation.itemConfirmations;

      if (dto.decision === "VERIFY" || dto.decision === "PARTIALLY_VERIFY") {
        itemConfirmations = confirmation.itemConfirmations.map((item) => {
          const verificationInput = verificationById.get(item.id);
          const verified = verificationInput?.verifiedReceivedQuantity ?? item.claimedReceivedQuantity;
          if (verified < 0) throw validationError("Verified quantity cannot be negative.");
          return {
            ...item,
            verifiedReceivedQuantity: verified,
            varianceQuantity: verified - item.expectedShippedQuantity,
            varianceReason: verificationInput?.varianceReason ?? item.varianceReason,
            remarks: verificationInput?.remarks ?? item.remarks,
          };
        });

        verificationEvent = {
          id: newId("podve"),
          deliveryConfirmationId: confirmation.id,
          attemptId: confirmation.activeAttemptId,
          idempotencyKey: command.idempotencyKey,
          appliedAt: now,
          appliedBy: command.actorUserId,
          itemApplications: itemConfirmations.map((item) => {
            const previous = confirmation.itemConfirmations.find((entry) => entry.id === item.id);
            return {
              shipmentBatchItemId: item.shipmentBatchItemId,
              salesPointAllocationId: item.salesPointAllocationId,
              previousVerifiedReceivedQuantity: previous?.verifiedReceivedQuantity ?? 0,
              newVerifiedReceivedQuantity: item.verifiedReceivedQuantity ?? 0,
              deltaQuantity: (item.verifiedReceivedQuantity ?? 0) - (previous?.verifiedReceivedQuantity ?? 0),
            };
          }),
        };
        verificationEventStore.upsert(verificationEvent);
        nextStatus = dto.decision === "VERIFY" ? "VERIFIED" : "PARTIALLY_VERIFIED";
      } else if (dto.decision === "REJECT") {
        nextStatus = "REJECTED";
      } else {
        nextStatus = "CORRECTION_REQUESTED";
      }

      const next: DeliveryConfirmation = {
        ...confirmation,
        status: nextStatus,
        itemConfirmations,
        reviewedByUserId: command.actorUserId,
        reviewedAt: now,
        rejectionReason: dto.decision === "REJECT" ? dto.reviewReason : confirmation.rejectionReason,
        correctionRequestedReason:
          dto.decision === "REQUEST_CORRECTION" ? dto.reviewReason : confirmation.correctionRequestedReason,
        attempts: confirmation.attempts.map((attempt) =>
          attempt.id === confirmation.activeAttemptId
            ? {
                ...attempt,
                status: nextStatus,
                reviewDecision: dto.decision,
                reviewReason: dto.reviewReason,
                reviewedAt: now,
                reviewedBy: command.actorUserId,
                itemConfirmations,
              }
            : attempt,
        ),
        quantitySummary: buildQuantitySummary(itemConfirmations),
        audit: { ...confirmation.audit, updatedAt: now, updatedBy: command.actorUserId },
        version: confirmation.version + 1,
      };

      context.audit({
        eventType:
          dto.decision === "REJECT" ? "REJECTED" : dto.decision === "REQUEST_CORRECTION" ? "CORRECTION_REQUESTED" : "VERIFIED",
        sourceEntityType: "DELIVERY_CONFIRMATION",
        sourceEntityId: confirmation.id,
        previousValue: confirmation.status,
        newValue: nextStatus,
        reason: dto.reviewReason,
      });
      if (verificationEvent) {
        context.domainEvent({
          eventType: "POD_VERIFICATION_APPLIED",
          aggregateType: "DELIVERY_CONFIRMATION",
          aggregateId: confirmation.id,
          payload: { verificationEventId: verificationEvent.id },
          idempotencyKey: command.idempotencyKey,
        });
      }

      store.upsert(next);
      return { confirmation: next, verificationEvent, version: next.version };
    },
  });
}

export function reverseVerification(
  dto: ReverseVerificationDto,
  command: CommandMetadata,
): MutationResponse<VerificationOutcome & { version: number }> {
  return runCommand({
    command,
    execute: (context) => {
      if (command.actorRole !== "ADMIN") {
        throw permissionDeniedError("pod:verify", "Only Admin can reverse a verification.");
      }
      if (!dto.reason) throw validationError("Reversal reason is required.");

      const confirmation = store.getById(dto.deliveryConfirmationId);
      if (!confirmation) throw notFoundError("DELIVERY_CONFIRMATION", dto.deliveryConfirmationId);
      assertVersion(confirmation, dto.expectedVersion, "DELIVERY_CONFIRMATION");

      const original = verificationEventStore.getById(dto.verificationEventId);
      if (!original) throw notFoundError("DELIVERY_CONFIRMATION", dto.verificationEventId);
      if (original.reversedByEventId) {
        throw invalidTransitionError("This verification event has already been reversed.");
      }

      const now = nowIso();
      const reversal: PodVerificationEvent = {
        id: newId("podve"),
        deliveryConfirmationId: confirmation.id,
        attemptId: original.attemptId,
        idempotencyKey: command.idempotencyKey,
        appliedAt: now,
        appliedBy: command.actorUserId,
        itemApplications: original.itemApplications.map((application) => ({
          shipmentBatchItemId: application.shipmentBatchItemId,
          salesPointAllocationId: application.salesPointAllocationId,
          previousVerifiedReceivedQuantity: application.newVerifiedReceivedQuantity,
          newVerifiedReceivedQuantity: application.previousVerifiedReceivedQuantity,
          deltaQuantity: application.previousVerifiedReceivedQuantity - application.newVerifiedReceivedQuantity,
        })),
      };
      verificationEventStore.upsert(reversal);
      verificationEventStore.upsert({ ...original, reversedByEventId: reversal.id });

      const itemConfirmations = confirmation.itemConfirmations.map((item) => {
        const application = reversal.itemApplications.find(
          (entry) => entry.shipmentBatchItemId === item.shipmentBatchItemId,
        );
        if (!application) return item;
        return { ...item, verifiedReceivedQuantity: application.newVerifiedReceivedQuantity };
      });

      const next: DeliveryConfirmation = {
        ...confirmation,
        status: "PENDING_VERIFICATION",
        itemConfirmations,
        quantitySummary: buildQuantitySummary(itemConfirmations),
        audit: { ...confirmation.audit, updatedAt: now, updatedBy: command.actorUserId },
        version: confirmation.version + 1,
      };

      context.audit({
        eventType: "STATUS_CHANGED",
        sourceEntityType: "DELIVERY_CONFIRMATION",
        sourceEntityId: confirmation.id,
        previousValue: confirmation.status,
        newValue: "PENDING_VERIFICATION",
        reason: dto.reason,
      });
      context.domainEvent({
        eventType: "POD_VERIFICATION_REVERSED",
        aggregateType: "DELIVERY_CONFIRMATION",
        aggregateId: confirmation.id,
        payload: { reversedEventId: original.id, reversalEventId: reversal.id },
      });

      store.upsert(next);
      return { confirmation: next, verificationEvent: reversal, version: next.version };
    },
  });
}
