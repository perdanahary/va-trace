/**
 * Phase 3 — Workflow orchestration layer (application services).
 *
 * Stores never write into each other (CR-07); multi-aggregate workflows are
 * composed here: batch creation with reservations, document generation, POD
 * submission/verification with quantity application, exception opening, and
 * projection cache refreshes. Every step uses store commands that emit audit
 * events and enforce `expectedVersion`.
 */

import type { CommandMetadata, ID, UserRole, MutationResponse } from "@/lib/types/v2/foundation";
import type { CreateOperationalExceptionDto, OperationalException } from "@/lib/types/v2/exception";
import type {
  CreateDeliveryConfirmationItemDto,
  DeliveryConfirmation,
  DeliveryNote,
  UploadFileReference,
} from "@/lib/types/v2/deliveryNote";
import type { ShipmentBatch } from "@/lib/types/v2/shipment";
import type { CarrierSnapshot } from "@/lib/types/v2/shipment";
import type { DeliveryConfirmationReviewDecision } from "@/lib/types/v2/status";
import { newIdempotencyKey, nowIso } from "@/lib/v2/ids";
import { toApiError } from "@/lib/v2/repository";
import {
  getAllocationById,
  getAllocationsForOrder,
  createAllocations,
  refreshAllocationCaches,
} from "@/lib/v2/allocationStore";
import {
  generateDeliveryNote as generateDeliveryNoteCommand,
  getActiveDeliveryNoteForBatch,
  getDeliveryNoteById,
  recordDeliveryNotePrint,
  setDeliveryNoteStatus,
  uploadSignedDeliveryNote,
} from "@/lib/v2/deliveryNoteStore";
import { getOpenBlockingExceptionsFor, openException } from "@/lib/v2/exceptionStore";
import { registerFileAsset } from "@/lib/v2/fileAssetStore";
import { generateLabelsForBatch, recordLabelPrint } from "@/lib/v2/labelStore";
import {
  createOrderRequestDraft,
  getOrderRequestById,
  submitOrderRequest,
  type OrderReferenceInputs,
} from "@/lib/v2/orderRequestStore";
import { getConfirmationsForBatch, reviewPod, submitPod } from "@/lib/v2/podStore";
import {
  adjustReservedQuantity,
  createProductionJobs,
  getProductionJobsForOrder,
  getUnreservedReadyQuantity,
} from "@/lib/v2/productionStore";
import {
  applyVerifiedQuantities,
  closeShipmentBatch,
  createShipmentBatch,
  dispatchShipmentBatch,
  getShipmentBatchById,
  getShipmentBatches,
  getShippedQuantityForAllocation,
  markShipmentBatchReady,
  setBatchDeliveryNote,
  setBatchLabelStatus,
  type CreateBatchAllocationInput,
} from "@/lib/v2/shipmentBatchStore";
import { getDeliveryConfirmations } from "@/lib/v2/podStore";
import { getOperationalExceptions } from "@/lib/v2/exceptionStore";
import { hydrateAllocation } from "@/lib/v2/projections";
import { addNotification } from "@/lib/v2/notificationStore";

// ---------------------------------------------------------------------------
// Actor context
// ---------------------------------------------------------------------------

export interface Actor {
  userId: ID;
  role: UserRole;
  vendorId?: ID;
  sourceScreen?: string;
}

export function buildCommand(actor: Actor, reason?: string): CommandMetadata {
  return {
    actorUserId: actor.userId,
    actorRole: actor.role,
    idempotencyKey: newIdempotencyKey(),
    reason,
    sourceScreen: actor.sourceScreen,
    correlationId: actor.vendorId ? `vendor:${actor.vendorId}` : undefined,
  };
}

export { toApiError };

// ---------------------------------------------------------------------------
// Allocation projection refresh (cached summaries rebuild)
// ---------------------------------------------------------------------------

function refreshOrderAllocations(orderRequestId: ID): void {
  const batches = getShipmentBatches().filter((batch) => batch.orderRequestId === orderRequestId);
  const confirmations = getDeliveryConfirmations().filter(
    (confirmation) => confirmation.orderRequestId === orderRequestId,
  );
  const hydrated = getAllocationsForOrder(orderRequestId).map((allocation) =>
    hydrateAllocation(allocation, batches, confirmations),
  );
  refreshAllocationCaches(hydrated);
}

// ---------------------------------------------------------------------------
// Workflows 1-3 — create, allocate, submit, and start production
// ---------------------------------------------------------------------------

export interface CreateSubmittedOrderInput {
  clientPoNumber?: string;
  tags?: string[];
  referenceLink?: {
    url: string;
    displayTitle?: string;
  };
  deadlineDate: string;
  requestedDeliveryDate?: string;
  remarks?: string;
  refs: OrderReferenceInputs;
  items: Array<{
    productId: ID;
    lineNumber: number;
    description?: string;
    specification?: string;
    orderedQuantity: number;
    unitOfMeasure?: "PCS";
    notes?: string;
  }>;
  allocations: Array<{
    orderItemClientLineNumber: number;
    salesPointId: ID;
    allocatedQuantity: number;
    notes?: string;
  }>;
  underAllocationReason?: string;
}

export function createSubmittedOrder(input: CreateSubmittedOrderInput, actor: Actor) {
  const draft = createOrderRequestDraft(
    {
      clientId: input.refs.client.id,
      projectId: input.refs.project.id,
      vendorId: input.refs.vendor.id,
      clientPoNumber: input.clientPoNumber,
      tags: input.tags,
      referenceLink: input.referenceLink,
      deadlineDate: input.deadlineDate,
      requestedDeliveryDate: input.requestedDeliveryDate,
      source:
        actor.role === "CLIENT"
          ? "CLIENT_PORTAL"
          : actor.role === "OPERATOR"
            ? "OPERATOR_CREATE"
            : "ADMIN_CREATE",
      priority: "NORMAL",
      remarks: input.remarks,
      underAllocationReason: input.underAllocationReason,
      externalReferences: input.clientPoNumber
        ? [{ type: "CLIENT_PO", value: input.clientPoNumber, sourceSystem: "MANUAL" }]
        : [],
      items: input.items.map((item) => ({
        ...item,
        unitOfMeasure: item.unitOfMeasure ?? "PCS",
      })),
    },
    input.refs,
    buildCommand({ ...actor, sourceScreen: actor.sourceScreen ?? "order-create" }),
  ).data;

  const itemByLineNumber = new Map(draft.items.map((item) => [item.lineNumber, item]));
  const allocationResponse = createAllocations(
    {
      orderRequestId: draft.id,
      underAllocationReason: input.underAllocationReason,
      allocations: input.allocations.map((allocation) => {
        const item = itemByLineNumber.get(allocation.orderItemClientLineNumber);
        if (!item) {
          throw new Error(`Line ${allocation.orderItemClientLineNumber} does not exist on order ${draft.orderRequestNumber}.`);
        }
        return {
          orderItemId: item.id,
          salesPointId: allocation.salesPointId,
          allocatedQuantity: allocation.allocatedQuantity,
          notes: allocation.notes,
        };
      }),
    },
    {
      orderedByItemId: new Map(draft.items.map((item) => [item.id, item.orderedQuantity])),
      productByItemId: new Map(draft.items.map((item) => [item.id, item.product])),
    },
    buildCommand(actor),
  );

  const allocatedByItemId = new Map<ID, number>();
  for (const allocation of allocationResponse.data) {
    allocatedByItemId.set(
      allocation.orderItemId,
      (allocatedByItemId.get(allocation.orderItemId) ?? 0) + allocation.allocatedQuantity,
    );
  }
  const fullyAllocated = draft.items.every(
    (item) => (allocatedByItemId.get(item.id) ?? 0) === item.orderedQuantity,
  );

  const submitted = submitOrderRequest(
    { orderRequestId: draft.id, expectedVersion: draft.version },
    {
      allocationCount: allocationResponse.data.length,
      allocationTotalsValid: true,
      fullyAllocated,
    },
    buildCommand(actor),
  ).data;

  const productionJobs = createProductionJobs(
    submitted.items.map((item) => ({
      orderRequestId: submitted.id,
      orderItemId: item.id,
      vendorId: submitted.vendor.id,
      orderedQuantity: item.orderedQuantity,
    })),
    buildCommand(actor),
  ).data;

  return {
    order: submitted,
    allocations: allocationResponse.data,
    productionJobs,
  };
}

// ---------------------------------------------------------------------------
// Workflow 4 — Shipment Batch creation (specs/03 §4)
// ---------------------------------------------------------------------------

export interface CreateBatchLineInput {
  allocationId: ID;
  quantity: number;
  remarks?: string;
}

export interface CreateBatchInput {
  orderRequestId: ID;
  lines: CreateBatchLineInput[];
  plannedDispatchDate?: string;
  carrier?: CarrierSnapshot;
  generateDeliveryNote?: boolean;
  generateLabels?: boolean;
  markReady?: boolean;
  remarks?: string;
}

export function createBatchFromAllocations(input: CreateBatchInput, actor: Actor): ShipmentBatch {
  const order = getOrderRequestById(input.orderRequestId);
  if (!order) {
    throw new Error(`Order ${input.orderRequestId} not found.`);
  }

  const jobs = getProductionJobsForOrder(input.orderRequestId);
  const allocationInputs = new Map<ID, CreateBatchAllocationInput>();

  for (const line of input.lines) {
    const allocation = getAllocationById(line.allocationId);
    if (!allocation) {
      throw new Error(`Allocation ${line.allocationId} not found.`);
    }
    const job = jobs.find((entry) => entry.orderItemId === allocation.orderItemId);
    allocationInputs.set(allocation.id, {
      allocation,
      previouslyShippedQuantity: getShippedQuantityForAllocation(allocation.id),
      availableReadyQuantity: getUnreservedReadyQuantity(allocation.orderItemId),
      productionJobId: job?.id,
    });
  }

  const command = buildCommand({ ...actor, sourceScreen: actor.sourceScreen ?? "batch-creation" });
  const created = createShipmentBatch(
    {
      orderRequestId: input.orderRequestId,
      plannedDispatchDate: input.plannedDispatchDate,
      carrier: input.carrier,
      remarks: input.remarks,
      generateDeliveryNote: input.generateDeliveryNote,
      generateLabels: input.generateLabels,
      items: input.lines.map((line) => {
        const allocation = getAllocationById(line.allocationId)!;
        return {
          salesPointAllocationId: line.allocationId,
          orderItemId: allocation.orderItemId,
          shippedQuantity: line.quantity,
          remarks: line.remarks,
        };
      }),
    },
    allocationInputs,
    command,
  );

  let batch = created.data;

  // HI-13 — reserve ready quantity per production job.
  for (const item of batch.items) {
    const input2 = allocationInputs.get(item.salesPointAllocationId);
    if (input2?.productionJobId) {
      try {
        adjustReservedQuantity(input2.productionJobId, item.shippedQuantity, buildCommand(actor));
      } catch {
        // Reservation shortfall surfaces as policy block at creation time already.
      }
    }
  }

  if (input.markReady || input.generateDeliveryNote) {
    batch = markShipmentBatchReady(
      { shipmentBatchId: batch.id, generateDeliveryNote: false, generateLabels: false, expectedVersion: batch.version },
      buildCommand(actor),
    ).data;
  }
  if (input.generateDeliveryNote) {
    batch = generateBatchDeliveryNote(batch.id, actor).batch;
  }
  if (input.generateLabels) {
    batch = generateBatchLabels(batch.id, actor);
  }

  refreshOrderAllocations(input.orderRequestId);
  return getShipmentBatchById(batch.id) ?? batch;
}

// ---------------------------------------------------------------------------
// Workflow 5 — Delivery Note + labels (specs/04 §4)
// ---------------------------------------------------------------------------

export function generateBatchDeliveryNote(
  shipmentBatchId: ID,
  actor: Actor,
  options: { regenerate?: boolean; regenerationReason?: string } = {},
): { batch: ShipmentBatch; deliveryNote: DeliveryNote } {
  const batch = getShipmentBatchById(shipmentBatchId);
  if (!batch) throw new Error(`Batch ${shipmentBatchId} not found.`);

  const order = getOrderRequestById(batch.orderRequestId);
  const lineNumbers = new Map<ID, number>(order?.items.map((item) => [item.id, item.lineNumber]) ?? []);

  const response = generateDeliveryNoteCommand(
    { shipmentBatchId, regenerate: options.regenerate, regenerationReason: options.regenerationReason },
    batch,
    { orderItemLineNumbers: lineNumbers, senderName: batch.vendor.name },
    buildCommand(actor),
  );

  const updatedBatch = setBatchDeliveryNote(
    shipmentBatchId,
    {
      deliveryNoteId: response.data.id,
      deliveryNoteNumber: response.data.deliveryNoteNumber,
      deliveryNoteStatus: response.data.status,
    },
    buildCommand(actor),
  ).data;

  return { batch: updatedBatch, deliveryNote: response.data };
}

export function printDeliveryNote(deliveryNoteId: ID, actor: Actor): DeliveryNote {
  const resolved = getDeliveryNoteById(deliveryNoteId);
  if (!resolved) throw new Error(`Delivery Note ${deliveryNoteId} not found.`);
  const printed = recordDeliveryNotePrint(
    { deliveryNoteId: resolved.id, printedAt: nowIso(), expectedVersion: resolved.version },
    buildCommand(actor),
  ).data;
  setBatchDeliveryNote(
    printed.shipmentBatchId,
    { deliveryNoteId: printed.id, deliveryNoteNumber: printed.deliveryNoteNumber, deliveryNoteStatus: printed.status },
    buildCommand(actor),
  );
  return printed;
}

export function generateBatchLabels(shipmentBatchId: ID, actor: Actor): ShipmentBatch {
  const batch = getShipmentBatchById(shipmentBatchId);
  if (!batch) throw new Error(`Batch ${shipmentBatchId} not found.`);

  const labels = generateLabelsForBatch(batch, buildCommand(actor)).data;
  const labelIdsByItem = new Map<ID, ID[]>();
  for (const label of labels) {
    const item = batch.items.find((entry) => entry.salesPoint.salesPointId === label.salesPointId && entry.product.materialCode === label.productCode);
    if (item) {
      labelIdsByItem.set(item.id, [...(labelIdsByItem.get(item.id) ?? []), label.id]);
    }
  }
  return setBatchLabelStatus(shipmentBatchId, "GENERATED", labelIdsByItem, buildCommand(actor)).data;
}

export function printBatchLabels(shipmentBatchId: ID, labelIds: ID[], actor: Actor): ShipmentBatch {
  recordLabelPrint({ shippingLabelIds: labelIds }, buildCommand(actor));
  const batch = getShipmentBatchById(shipmentBatchId);
  if (!batch) throw new Error(`Batch ${shipmentBatchId} not found.`);
  return setBatchLabelStatus(shipmentBatchId, "PRINTED", new Map(), buildCommand(actor)).data;
}

// ---------------------------------------------------------------------------
// Dispatch and closure
// ---------------------------------------------------------------------------

export function dispatchBatch(shipmentBatchId: ID, actor: Actor, carrier?: CarrierSnapshot): ShipmentBatch {
  const batch = getShipmentBatchById(shipmentBatchId);
  if (!batch) throw new Error(`Batch ${shipmentBatchId} not found.`);

  const dispatched = dispatchShipmentBatch(
    { shipmentBatchId, dispatchedAt: nowIso(), carrier, expectedVersion: batch.version },
    buildCommand(actor),
  ).data;
  refreshOrderAllocations(dispatched.orderRequestId);
  return dispatched;
}

export function closeBatch(shipmentBatchId: ID, actor: Actor, closureReason?: string): ShipmentBatch {
  const batch = getShipmentBatchById(shipmentBatchId);
  if (!batch) throw new Error(`Batch ${shipmentBatchId} not found.`);

  const blocking = getOpenBlockingExceptionsFor(shipmentBatchId);
  const closed = closeShipmentBatch(
    { shipmentBatchId, closedAt: nowIso(), closureReason, expectedVersion: batch.version },
    blocking.length > 0,
    buildCommand(actor, closureReason),
  ).data;

  const note = getActiveDeliveryNoteForBatch(shipmentBatchId);
  if (note && note.status === "VERIFIED") {
    setDeliveryNoteStatus(note.id, "CLOSED", buildCommand(actor));
  }
  return closed;
}

// ---------------------------------------------------------------------------
// Workflow 6 — POD (specs/06 §4)
// ---------------------------------------------------------------------------

export interface SubmitPodInput {
  shipmentBatchId: ID;
  salesPointId: ID;
  receiverName: string;
  receiverRole?: string;
  receiverPhone?: string;
  receivedDate: string;
  evidence: UploadFileReference[];
  itemConfirmations: CreateDeliveryConfirmationItemDto[];
  notes?: string;
}

export function submitBatchPod(input: SubmitPodInput, actor: Actor): DeliveryConfirmation {
  const batch = getShipmentBatchById(input.shipmentBatchId);
  if (!batch) throw new Error(`Batch ${input.shipmentBatchId} not found.`);
  const note = getActiveDeliveryNoteForBatch(input.shipmentBatchId);

  // CR-05 — every evidence file becomes a FileAsset before linkage.
  const evidenceAssetIds = input.evidence.map(
    (file) => registerFileAsset(file, buildCommand(actor)).data.id,
  );

  const confirmation = submitPod(
    {
      shipmentBatchId: input.shipmentBatchId,
      deliveryNoteId: note?.id ?? "",
      salesPointId: input.salesPointId,
      receiverName: input.receiverName,
      receiverRole: input.receiverRole,
      receiverPhone: input.receiverPhone,
      receivedDate: input.receivedDate,
      evidence: input.evidence,
      itemConfirmations: input.itemConfirmations,
      notes: input.notes,
    },
    batch,
    evidenceAssetIds,
    buildCommand(actor),
  ).data;

  // Signed DN upload advances the document lifecycle to UPLOADED.
  const signedDn = input.evidence.find((file) => file.mimeType === "application/pdf") ?? input.evidence[0];
  if (note && signedDn) {
    const uploaded = uploadSignedDeliveryNote(
      {
        deliveryNoteId: note.id,
        shipmentBatchId: input.shipmentBatchId,
        file: signedDn,
        expectedVersion: note.version,
      },
      evidenceAssetIds[input.evidence.indexOf(signedDn)] ?? evidenceAssetIds[0],
      buildCommand(actor),
    ).data;
    setBatchDeliveryNote(
      input.shipmentBatchId,
      { deliveryNoteId: uploaded.id, deliveryNoteNumber: uploaded.deliveryNoteNumber, deliveryNoteStatus: uploaded.status },
      buildCommand(actor),
    );
  }

  return confirmation;
}

export interface VerifyPodInput {
  deliveryConfirmationId: ID;
  decision: DeliveryConfirmationReviewDecision;
  reviewReason?: string;
  itemVerifications: Array<{
    deliveryConfirmationItemId: ID;
    verifiedReceivedQuantity: number;
  }>;
}

export function verifyBatchPod(input: VerifyPodInput, actor: Actor): DeliveryConfirmation {
  const confirmations = getDeliveryConfirmations();
  const confirmation = confirmations.find((entry) => entry.id === input.deliveryConfirmationId);
  if (!confirmation) throw new Error(`POD ${input.deliveryConfirmationId} not found.`);

  const outcome = reviewPod(
    {
      deliveryConfirmationId: input.deliveryConfirmationId,
      decision: input.decision,
      reviewReason: input.reviewReason,
      itemVerifications: input.itemVerifications,
      expectedVersion: confirmation.version,
    },
    buildCommand(actor, input.reviewReason),
  ).data;

  if (outcome.verificationEvent) {
    // Apply verified quantities to the owning batch (single quantity source).
    applyVerifiedQuantities(
      confirmation.shipmentBatchId,
      outcome.verificationEvent.itemApplications.map((application) => ({
        shipmentBatchItemId: application.shipmentBatchItemId,
        newVerifiedReceivedQuantity: application.newVerifiedReceivedQuantity,
      })),
      buildCommand(actor),
    );

    // DN lifecycle: UPLOADED -> VERIFIED on accepted evidence.
    const note = getActiveDeliveryNoteForBatch(confirmation.shipmentBatchId);
    if (note && note.status !== "CLOSED") {
      const verifiedNote = setDeliveryNoteStatus(note.id, "VERIFIED", buildCommand(actor)).data;
      setBatchDeliveryNote(
        confirmation.shipmentBatchId,
        {
          deliveryNoteId: verifiedNote.id,
          deliveryNoteNumber: verifiedNote.deliveryNoteNumber,
          deliveryNoteStatus: verifiedNote.status,
        },
        buildCommand(actor),
      );
    }

    // Quantity variance opens an operational exception (CR-01).
    const shortages = outcome.verificationEvent.itemApplications.filter((application) => {
      const batch = getShipmentBatchById(confirmation.shipmentBatchId);
      const item = batch?.items.find((entry) => entry.id === application.shipmentBatchItemId);
      return item ? application.newVerifiedReceivedQuantity !== item.shippedQuantity : false;
    });
    if (shortages.length > 0) {
      openException(
        {
          type: "QUANTITY_VARIANCE",
          severity: "HIGH",
          ownerRole: "ADMIN",
          sourceEntityType: "SHIPMENT_BATCH",
          sourceEntityId: confirmation.shipmentBatchId,
          affectedEntityRefs: shortages.map((application) => ({
            entityType: "SALES_POINT_ALLOCATION",
            entityId: application.salesPointAllocationId,
          })),
          title: `Quantity variance on POD ${confirmation.id}`,
          description: `Verified received quantity differs from shipped quantity on ${shortages.length} line(s).`,
        },
        buildCommand(actor),
      );
    }
  }

  if (input.decision === "REJECT" || input.decision === "REQUEST_CORRECTION") {
    openException(
      {
        type: "REJECTED_POD",
        severity: "MEDIUM",
        ownerRole: "VENDOR",
        sourceEntityType: "DELIVERY_CONFIRMATION",
        sourceEntityId: confirmation.id,
        title: `POD ${input.decision === "REJECT" ? "rejected" : "correction requested"} for batch ${confirmation.shipmentBatchId}`,
        description: input.reviewReason ?? "Admin returned the POD submission to the vendor.",
      },
      buildCommand(actor),
    );
  }

  refreshOrderAllocations(confirmation.orderRequestId);
  return outcome.confirmation;
}

// ---------------------------------------------------------------------------
// Derived helpers for pages
// ---------------------------------------------------------------------------

export function getBatchPodBacklog(vendorId?: ID): ShipmentBatch[] {
  return getShipmentBatches().filter((batch) => {
    if (vendorId && batch.vendor.id !== vendorId) return false;
    if (!["DISPATCHED", "IN_TRANSIT", "PARTIALLY_RECEIVED"].includes(batch.status)) return false;
    const confirmations = getConfirmationsForBatch(batch.id);
    return confirmations.length === 0 || confirmations.some((entry) => ["REJECTED", "CORRECTION_REQUESTED"].includes(entry.status));
  });
}

export function hasOpenBlockingExceptions(entityId: ID): boolean {
  return getOpenBlockingExceptionsFor(entityId).length > 0;
}

export function getExceptionsSnapshot() {
  return getOperationalExceptions();
}

// ---------------------------------------------------------------------------
// Complaint / Exception notification workflow
// ---------------------------------------------------------------------------

export function raiseComplaint(
  dto: CreateOperationalExceptionDto,
  commandDescription: string,
  actor: Actor,
): MutationResponse<OperationalException> {
  const command = buildCommand(actor, commandDescription);
  const result = openException(dto, command);

  addNotification({
    exceptionId: result.data.id,
    orderId: dto.sourceEntityType === "ORDER_REQUEST" ? dto.sourceEntityId : undefined,
    relatedEntityType: dto.sourceEntityType,
    relatedEntityId: dto.sourceEntityId,
    title: dto.title,
    description: dto.description,
    severity: dto.severity,
  });

  return result;
}
