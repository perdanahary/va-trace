/**
 * P1-20 — Normalized V2 seed builders.
 *
 * Builds the complete V2 dataset from the legacy mocks and the (untouched)
 * `va-trace-orders` aggregate snapshot:
 * - `mock/salesPoints.ts` -> SalesPoint + contacts + data quality flags
 * - legacy orders -> OrderRequest/OrderItem + allocations + production jobs
 * - embedded/compatibility shipment batches -> ShipmentBatch (CR-09 flags)
 * - stored/derived delivery notes -> batch-scoped DeliveryNote records
 * - embedded POD uploads -> DeliveryConfirmation with attempt history
 *
 * CR-09 semantics: legacy `deliveredQuantity` becomes verified received
 * quantity ONLY on batches flagged `legacyVerificationFlag = true`
 * (`compatibilitySource = "LEGACY_MIGRATION"`); nothing here rewrites the
 * legacy storage key.
 */

import { mockSalesPoints } from "@/lib/mock/salesPoints";
import { salesPointSeeds, type SalesPointSeed } from "@/lib/salesPointSeed";
import { getOrdersSnapshot, type StoredOrder } from "@/lib/orderStore";
import { getSupplierSnapshot } from "@/lib/supplierStore";
import type { SalesPointMapping } from "@/lib/types/salesPoint";
import type {
  DeliveryConfirmation,
  DeliveryNote,
  DeliveryNoteItem,
} from "@/lib/types/v2/deliveryNote";
import type {
  AuditStamp,
  ClientReference,
  ProductReference,
  ProjectReference,
  VendorReference,
} from "@/lib/types/v2/foundation";
import type { OrderItem, OrderRequest } from "@/lib/types/v2/orderRequest";
import type { ProductionJob } from "@/lib/types/v2/production";
import type {
  SalesPoint,
  SalesPointAllocation,
  SalesPointContact,
} from "@/lib/types/v2/salesPoint";
import type {
  ShipmentBatch,
  ShipmentBatchItem,
  ShipmentDestinationSnapshot,
} from "@/lib/types/v2/shipment";
import type { SalesPointContactRole, ShipmentBatchStatus } from "@/lib/types/v2/status";
import type { WorkflowPolicy } from "@/lib/types/v2/policy";
import {
  mapLegacyConfirmationStatus,
  productionStatusFromLegacyItemStatus,
} from "@/lib/v2/compat/legacyLabels";
import { checksum } from "@/lib/v2/ids";
import { buildBatchQuantitySummary } from "@/lib/v2/projections";
import { deriveSalesPointDataQuality } from "@/lib/v2/selectors/salesPointQuality";

const SYSTEM_USER = "system-migration";

function migrationAudit(timestamp = "2026-01-01T00:00:00.000Z"): AuditStamp {
  return { createdAt: timestamp, createdBy: SYSTEM_USER, updatedAt: timestamp, updatedBy: SYSTEM_USER };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "unknown";
}

// ---------------------------------------------------------------------------
// Sales Points
// ---------------------------------------------------------------------------

function parseContactRole(remarks: string, picIndex: 1 | 2): SalesPointContactRole {
  const match = remarks.match(new RegExp(`PIC\\s*${picIndex}\\s*:\\s*([A-Za-z_ ]+)`, "i"));
  const role = match?.[1]?.trim().toUpperCase().replace(/\s+/g, "_");
  if (role === "ARA" || role === "SRE" || role === "SPV_DPC" || role === "RECEIVER" || role === "LOGISTICS" || role === "CLIENT_PIC") {
    return role;
  }
  return picIndex === 1 ? "ARA" : "SRE";
}

export function buildSalesPointSeed(mapping: SalesPointMapping): SalesPoint {
  const audit = migrationAudit();
  const contacts: SalesPointContact[] = [];

  if (mapping.pic1?.name) {
    contacts.push({
      id: `${mapping.wcode}-contact-1`,
      salesPointId: mapping.wcode,
      name: mapping.pic1.name,
      role: parseContactRole(mapping.remarks ?? "", 1),
      phone: mapping.pic1.phone || undefined,
      email: mapping.pic1.email || undefined,
      isPrimary: true,
      isActive: true,
      audit,
    });
  }
  if (mapping.pic2?.name) {
    contacts.push({
      id: `${mapping.wcode}-contact-2`,
      salesPointId: mapping.wcode,
      name: mapping.pic2.name,
      role: parseContactRole(mapping.remarks ?? "", 2),
      phone: mapping.pic2.phone || undefined,
      email: mapping.pic2.email || undefined,
      isPrimary: false,
      isActive: true,
      audit,
    });
  }

  const line1 = mapping.address || mapping.shippingAddress?.alamat || "";
  const city = mapping.shippingAddress?.kotaKabupaten || "";
  const province = mapping.shippingAddress?.provinsi || "";
  const postalCode = mapping.shippingAddress?.kodePos || "";

  const base: Omit<SalesPoint, "dataQuality"> = {
    id: mapping.wcode,
    code: `SP-${mapping.wcode}`,
    wCode: mapping.wcode,
    name: mapping.salesPoint,
    clientId: mapping.clientId,
    clientName: mapping.clientName,
    companyName: mapping.companyName,
    status: "ACTIVE",
    entityType: "DISTRIBUTION_POINT",
    geography: {
      zone: mapping.zone,
      region: mapping.region,
      area: mapping.area,
      subArea: mapping.subArea || mapping.area,
    },
    address: {
      line1,
      city: city || undefined,
      province: province || undefined,
      postalCode: postalCode || undefined,
      country: "Indonesia",
      fullAddress: [line1, city, province, postalCode].filter(Boolean).join(", "),
    },
    deliveryInstructions: mapping.note?.trim() || undefined,
    contacts,
    audit,
    version: 1,
  };

  return { ...base, dataQuality: deriveSalesPointDataQuality(base) };
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

function vendorReference(supplierName: string): VendorReference {
  const supplier = getSupplierSnapshot().find((entry) => entry.name === supplierName);
  if (supplier) {
    return { id: supplier.id, name: supplier.name };
  }
  throw new Error(`Unknown vendor: "${supplierName}". Cannot seed order: vendor must match a registered supplier.`);
}

function clientReference(order: StoredOrder): ClientReference {
  return { id: order.clientId ?? `client_${slug(order.clientName ?? "unknown")}`, name: order.clientName ?? "Unknown Client" };
}

function projectReference(order: StoredOrder, client: ClientReference): ProjectReference {
  return { id: `project_${slug(order.campaign ?? "")}`, name: order.campaign ?? "", clientId: client.id };
}

function productReference(productCode: string, name: string): ProductReference {
  return {
    id: productCode,
    code: productCode,
    sku: productCode,
    materialCode: productCode,
    name,
    unitOfMeasure: "PCS",
  };
}

function destinationSnapshot(salesPoint: SalesPoint): ShipmentDestinationSnapshot {
  return {
    salesPointId: salesPoint.id,
    salesPointCode: salesPoint.code,
    wCode: salesPoint.wCode,
    salesPointName: salesPoint.name,
    clientId: salesPoint.clientId,
    clientName: salesPoint.clientName,
    companyName: salesPoint.companyName,
    zone: salesPoint.geography.zone,
    region: salesPoint.geography.region,
    area: salesPoint.geography.area,
    subArea: salesPoint.geography.subArea,
    address: salesPoint.address.fullAddress,
    deliveryInstructions: salesPoint.deliveryInstructions,
    contacts: salesPoint.contacts.map((contact) => ({
      contactId: contact.id,
      name: contact.name,
      role: contact.role,
      phone: contact.phone,
      email: contact.email,
      isPrimary: contact.isPrimary,
    })),
    snapshotVersion: salesPoint.version,
    capturedAt: salesPoint.audit.updatedAt,
  };
}

function fallbackSalesPoint(salesPointId: string): SalesPoint {
  const audit = migrationAudit();
  const base: Omit<SalesPoint, "dataQuality"> = {
    id: salesPointId,
    code: salesPointId,
    wCode: salesPointId,
    name: salesPointId,
    clientId: "client_unknown",
    clientName: "Unknown Client",
    companyName: "Unknown",
    status: "NEEDS_REVIEW",
    geography: { zone: "", region: "", area: "", subArea: "" },
    address: { line1: "", country: "Indonesia", fullAddress: "" },
    contacts: [],
    audit,
    version: 1,
  };
  return { ...base, dataQuality: deriveSalesPointDataQuality(base) };
}

// ---------------------------------------------------------------------------
// Order aggregates
// ---------------------------------------------------------------------------

export interface V2SeedData {
  salesPoints: SalesPoint[];
  orderRequests: OrderRequest[];
  allocations: SalesPointAllocation[];
  productionJobs: ProductionJob[];
  shipmentBatches: ShipmentBatch[];
  deliveryNotes: DeliveryNote[];
  deliveryConfirmations: DeliveryConfirmation[];
  policies: WorkflowPolicy[];
}

let cachedSeed: V2SeedData | null = null;

export function buildV2SeedData(): V2SeedData {
  if (cachedSeed) {
    return cachedSeed;
  }

  const salesPoints = mockSalesPoints.map(buildSalesPointSeed);
  const salesPointIndex = new Map(salesPoints.map((salesPoint) => [salesPoint.wCode, salesPoint]));
  const resolveSalesPoint = (salesPointId: string): SalesPoint => {
    const existing = salesPointIndex.get(salesPointId);
    if (existing) return existing;
    const fallback = fallbackSalesPoint(salesPointId);
    salesPoints.push(fallback);
    salesPointIndex.set(salesPointId, fallback);
    return fallback;
  };

  const orderRequests: OrderRequest[] = [];
  const allocations: SalesPointAllocation[] = [];
  const productionJobs: ProductionJob[] = [];
  const shipmentBatches: ShipmentBatch[] = [];
  const deliveryNotes: DeliveryNote[] = [];
  const deliveryConfirmations: DeliveryConfirmation[] = [];

  const legacyOrders = getOrdersSnapshot();

  for (const legacyOrder of legacyOrders) {
    const audit = migrationAudit(`${legacyOrder.createdDate}T00:00:00.000Z`);
    const client = clientReference(legacyOrder);
    const project = projectReference(legacyOrder, client);
    const vendor = vendorReference(legacyOrder.supplier);

    // --- Order items
    const items: OrderItem[] = legacyOrder.items.map((legacyItem, index) => {
      const productionStatus = productionStatusFromLegacyItemStatus(legacyItem.status);
      return {
        id: `${legacyOrder.id}::${legacyItem.id}`,
        orderRequestId: legacyOrder.id,
        lineNumber: Number(legacyItem.poLineNumber) || index + 1,
        product: productReference(legacyItem.productCode, legacyItem.name),
        description: legacyItem.name,
        orderedQuantity: legacyItem.quantity,
        unitOfMeasure: "PCS",
        productionStatus,
        productionReadyQuantity:
          productionStatus === "IN_PROGRESS" || productionStatus === "COMPLETED" ? legacyItem.quantity : 0,
        productionCompletedQuantity: productionStatus === "COMPLETED" ? legacyItem.quantity : 0,
        allocatedQuantity: legacyItem.quantity,
        shippedQuantity: 0,
        receivedQuantity: 0,
        remainingToAllocateQuantity: 0,
      };
    });
    const itemByLegacyId = new Map(legacyOrder.items.map((legacyItem, index) => [legacyItem.id, items[index]]));

    // --- Production jobs (one per item; HI-01)
    for (const item of items) {
      productionJobs.push({
        id: `${item.id}::job`,
        jobNumber: `JOB-${legacyOrder.id.replace(/^OR-/, "")}-${String(item.lineNumber).padStart(2, "0")}`,
        orderRequestId: legacyOrder.id,
        orderItemId: item.id,
        vendorId: vendor.id,
        status: item.productionStatus,
        orderedQuantity: item.orderedQuantity,
        producedQuantity: item.productionCompletedQuantity || item.productionReadyQuantity,
        reservedForShipmentQuantity: 0,
        completedQuantity: item.productionCompletedQuantity,
        reworkQuantity: 0,
        rejectedQuantity: 0,
        attachmentFileAssetIds: [],
        exceptionIds: [],
        audit,
        version: 1,
      });
    }

    // --- Allocations
    for (const legacyAllocation of legacyOrder.allocations) {
      const item = itemByLegacyId.get(legacyAllocation.orderLineId);
      if (!item) continue;
      const salesPoint = resolveSalesPoint(legacyAllocation.salesPointId);
      allocations.push({
        id: legacyAllocation.id,
        orderRequestId: legacyOrder.id,
        orderItemId: item.id,
        product: item.product,
        salesPoint: {
          id: salesPoint.id,
          code: salesPoint.code,
          wCode: salesPoint.wCode,
          name: salesPoint.name,
          zone: salesPoint.geography.zone,
          region: salesPoint.geography.region,
          area: salesPoint.geography.area,
          subArea: salesPoint.geography.subArea,
        },
        allocatedQuantity: legacyAllocation.allocatedQuantity,
        shippedQuantity: 0,
        receivedQuantity: 0,
        outstandingQuantity: legacyAllocation.allocatedQuantity,
        remainingToReceiveQuantity: legacyAllocation.allocatedQuantity,
        status: "NOT_SHIPPED",
        podStatus: "NOT_STARTED",
        exceptionState: "NONE",
        batchIds: [],
        audit,
        version: 1,
      });
    }

    // --- Shipment batches (compatibility semantics per CR-09)
    legacyOrder.shipmentBatches.forEach((legacyBatch, batchIndex) => {
      const isCompatibility = legacyBatch.source === "LEGACY_COMPATIBILITY";
      const batchItems: ShipmentBatchItem[] = legacyBatch.items.flatMap((legacyItem) => {
        const item = itemByLegacyId.get(legacyItem.orderLineId);
        if (!item) return [];
        const salesPoint = resolveSalesPoint(legacyItem.salesPointId);
        const allocationId =
          legacyItem.allocationId ?? `${legacyOrder.id}-${legacyItem.salesPointId}-${legacyItem.orderLineId}`;
        const allocation = allocations.find((entry) => entry.id === allocationId);
        const allocated = allocation?.allocatedQuantity ?? item.orderedQuantity;

        return [
          {
            id: legacyItem.id,
            shipmentBatchId: legacyBatch.id,
            orderRequestId: legacyOrder.id,
            orderItemId: item.id,
            salesPointAllocationId: allocationId,
            product: {
              productId: item.product.id,
              sku: item.product.sku,
              materialCode: item.product.materialCode,
              name: item.product.name,
              unitOfMeasure: item.product.unitOfMeasure,
            },
            salesPoint: {
              salesPointId: salesPoint.id,
              code: salesPoint.code,
              wCode: salesPoint.wCode,
              name: salesPoint.name,
              zone: salesPoint.geography.zone,
              region: salesPoint.geography.region,
              area: salesPoint.geography.area,
              subArea: salesPoint.geography.subArea,
            },
            allocatedQuantity: allocated,
            previouslyShippedQuantity: 0,
            outstandingBeforeBatchQuantity: allocated,
            shippedQuantity: legacyItem.quantity,
            verifiedReceivedQuantity: legacyItem.receivedQuantity,
            claimedReceivedQuantity: legacyItem.claimedReceivedQuantity ?? (legacyItem.receivedQuantity || undefined),
            outstandingAfterBatchQuantity: Math.max(allocated - legacyItem.quantity, 0),
            varianceQuantity: legacyItem.receivedQuantity - legacyItem.quantity,
            status:
              legacyItem.receivedQuantity >= legacyItem.quantity && legacyItem.quantity > 0
                ? "FULLY_RECEIVED"
                : legacyItem.receivedQuantity > 0
                  ? "PARTIALLY_RECEIVED"
                  : "SHIPPED",
            podStatus: legacyItem.receivedQuantity > 0 ? "VERIFIED" : "PENDING_UPLOAD",
            labelIds: [],
            remarks: legacyItem.remarks,
          } satisfies ShipmentBatchItem,
        ];
      });

      const sequence = batchIndex + 1;
      const batchNumber = `BATCH-${legacyOrder.createdDate.replace(/-/g, "")}-${legacyOrder.id.replace(/\D/g, "").slice(-4)}${sequence}`;
      const destinations = [...new Set(batchItems.map((batchItem) => batchItem.salesPoint.salesPointId))].map(
        (salesPointId) => destinationSnapshot(resolveSalesPoint(salesPointId)),
      );

      const batch: ShipmentBatch = {
        id: legacyBatch.id,
        batchNumber,
        orderRequestId: legacyOrder.id,
        orderRequestNumber: legacyOrder.id,
        clientPoNumber: legacyOrder.clientPO || null,
        client,
        project,
        vendor,
        status: legacyBatch.status as ShipmentBatchStatus,
        deliveryNoteId: legacyBatch.deliveryNoteId,
        labelStatus: legacyOrder.storedLabels.some((label) => label.shipmentBatchId === legacyBatch.id)
          ? "GENERATED"
          : "NOT_GENERATED",
        podStatus: batchItems.some((batchItem) => batchItem.verifiedReceivedQuantity > 0) ? "VERIFIED" : "NOT_STARTED",
        plannedDispatchDate: legacyBatch.plannedDispatchDate,
        dispatchedAt: legacyBatch.dispatchedAt,
        closedAt: legacyBatch.closedAt,
        senderSnapshot: { name: vendor.name, address: "" },
        destinationSnapshots: destinations,
        items: batchItems,
        quantitySummary: buildBatchQuantitySummary(batchItems),
        exceptionSummary: { hasException: false, exceptionCount: 0, unresolvedReasons: [] },
        carrier: legacyBatch.carrier,
        compatibilitySource: isCompatibility ? "LEGACY_MIGRATION" : undefined,
        legacyVerificationFlag: isCompatibility && batchItems.some((batchItem) => batchItem.verifiedReceivedQuantity > 0),
        audit,
        version: 1,
      };
      shipmentBatches.push(batch);

      // --- Delivery note for the batch (one active DN per batch)
      if (legacyBatch.deliveryNoteId) {
        const storedNote = legacyOrder.storedDeliveryNotes.find((note) => note.shipmentBatchId === legacyBatch.id);
        const deliveryNoteNumber =
          storedNote?.doNumber ?? `DEL${legacyOrder.createdDate.replace(/\D/g, "")}${legacyOrder.id.replace(/\D/g, "").slice(-6)}`;
        const itemById = new Map(items.map((item) => [item.id, item]));
        const noteItems: DeliveryNoteItem[] = batchItems.map((batchItem, itemIndex) => ({
          id: `${legacyBatch.deliveryNoteId}-line-${itemIndex + 1}`,
          deliveryNoteId: legacyBatch.deliveryNoteId as string,
          shipmentBatchItemId: batchItem.id,
          orderItemId: batchItem.orderItemId,
          salesPointAllocationId: batchItem.salesPointAllocationId,
          poLineNumber: itemById.get(batchItem.orderItemId)?.lineNumber ?? itemIndex + 1,
          salesPointId: batchItem.salesPoint.salesPointId,
          salesPointCode: batchItem.salesPoint.code,
          salesPointName: batchItem.salesPoint.name,
          materialCode: batchItem.product.materialCode,
          sku: batchItem.product.sku,
          description: batchItem.product.name,
          orderedQuantity: itemById.get(batchItem.orderItemId)?.orderedQuantity ?? batchItem.allocatedQuantity,
          allocatedQuantity: batchItem.allocatedQuantity,
          previouslyShippedQuantity: batchItem.previouslyShippedQuantity,
          shippedQuantity: batchItem.shippedQuantity,
          outstandingQuantityAfterShipment: batchItem.outstandingAfterBatchQuantity,
          unitOfMeasure: batchItem.product.unitOfMeasure,
        }));

        deliveryNotes.push({
          id: legacyBatch.deliveryNoteId,
          deliveryNoteNumber,
          shipmentBatchId: legacyBatch.id,
          batchNumber,
          orderRequestId: legacyOrder.id,
          orderRequestNumber: legacyOrder.id,
          clientPoNumber: legacyOrder.clientPO || null,
          salesOrderNumber: legacyOrder.soNumber || undefined,
          projectName: legacyOrder.campaign ?? "",
          client: { id: client.id, name: legacyOrder.clientEntityName ?? client.name },
          vendor: { id: vendor.id, name: vendor.name },
          senderSnapshot: { name: vendor.name },
          destinationSnapshots: destinations.map((destination) => ({
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
          status: storedNote?.status ?? "GENERATED",
          documentVersion: 1,
          isActive: true,
          generatedAt: storedNote?.createdAt ?? audit.createdAt,
          generatedByUserId: SYSTEM_USER,
          printCount: 0,
          qrPayload: {
            deliveryNoteId: legacyBatch.deliveryNoteId,
            deliveryNoteNumber,
            shipmentBatchId: legacyBatch.id,
            batchNumber,
            orderRequestId: legacyOrder.id,
            generatedAt: storedNote?.createdAt ?? audit.createdAt,
            checksum: checksum(`${deliveryNoteNumber}:${legacyBatch.id}`),
          },
          items: noteItems,
          signatureFields: {
            receiverSignatureRequired: true,
            receiverStampRequired: true,
            receivedDateRequired: true,
          },
          documentFiles: [],
          quantitySummary: {
            salesPointCount: destinations.length,
            itemCount: noteItems.length,
            orderedContextQuantity: noteItems.reduce((total, line) => total + line.orderedQuantity, 0),
            allocatedContextQuantity: noteItems.reduce((total, line) => total + line.allocatedQuantity, 0),
            shippedQuantity: noteItems.reduce((total, line) => total + line.shippedQuantity, 0),
            outstandingQuantityAfterShipment: noteItems.reduce(
              (total, line) => total + line.outstandingQuantityAfterShipment,
              0,
            ),
          },
          notes: legacyOrder.note,
          audit,
          version: 1,
        });
      }

      // --- Delivery confirmations
      legacyBatch.deliveryConfirmations.forEach((legacyConfirmation, confirmationIndex) => {
        const status = mapLegacyConfirmationStatus(legacyConfirmation.status);
        const itemConfirmations = batchItems
          .filter((batchItem) => batchItem.salesPoint.salesPointId === legacyConfirmation.salesPointId || batchItems.length === 1)
          .map((batchItem, itemIndex) => {
            const claimed =
              legacyConfirmation.itemConfirmations?.find((entry) => entry.shipmentItemId === batchItem.id)
                ?.claimedReceivedQuantity ?? batchItem.verifiedReceivedQuantity;
            return {
              id: `${legacyConfirmation.id}-item-${itemIndex + 1}`,
              deliveryConfirmationId: legacyConfirmation.id,
              shipmentBatchItemId: batchItem.id,
              salesPointAllocationId: batchItem.salesPointAllocationId,
              materialCode: batchItem.product.materialCode,
              sku: batchItem.product.sku,
              expectedShippedQuantity: batchItem.shippedQuantity,
              claimedReceivedQuantity: claimed,
              verifiedReceivedQuantity: status === "VERIFIED" ? batchItem.verifiedReceivedQuantity : undefined,
              varianceQuantity: claimed - batchItem.shippedQuantity,
              condition: "GOOD" as const,
            };
          });

        const expected = itemConfirmations.reduce((total, entry) => total + entry.expectedShippedQuantity, 0);
        const claimed = itemConfirmations.reduce((total, entry) => total + entry.claimedReceivedQuantity, 0);
        const verified = itemConfirmations.reduce((total, entry) => total + (entry.verifiedReceivedQuantity ?? 0), 0);
        const salesPoint = resolveSalesPoint(legacyConfirmation.salesPointId);
        const attemptId = `${legacyConfirmation.id}-attempt-1`;

        deliveryConfirmations.push({
          id: legacyConfirmation.id,
          shipmentBatchId: legacyBatch.id,
          deliveryNoteId: legacyBatch.deliveryNoteId ?? "",
          deliveryNoteNumber:
            deliveryNotes.find((note) => note.shipmentBatchId === legacyBatch.id)?.deliveryNoteNumber ?? "",
          orderRequestId: legacyOrder.id,
          salesPointId: salesPoint.id,
          salesPointCode: salesPoint.code,
          salesPointName: salesPoint.name,
          status,
          receiverName: legacyConfirmation.receiverName,
          receivedDate: legacyConfirmation.receivedAt.slice(0, 10),
          submittedByUserId: legacyConfirmation.submittedBy ?? SYSTEM_USER,
          submittedAt: legacyConfirmation.submittedAt ?? legacyConfirmation.receivedAt,
          reviewedByUserId: legacyConfirmation.reviewedBy ?? legacyConfirmation.verifiedBy,
          reviewedAt: legacyConfirmation.reviewedAt ?? legacyConfirmation.verifiedAt,
          evidence: legacyConfirmation.scannedDeliveryNoteUrl
            ? [
                {
                  id: `${legacyConfirmation.id}-evidence-1`,
                  type: "SIGNED_DN",
                  fileAssetId: `${legacyConfirmation.id}-file-1`,
                  fileName: "signed-delivery-note.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 0,
                  storageKey: legacyConfirmation.scannedDeliveryNoteUrl,
                  uploadedAt: legacyConfirmation.receivedAt,
                  uploadedByUserId: SYSTEM_USER,
                },
              ]
            : [],
          itemConfirmations,
          attempts: [
            {
              id: attemptId,
              deliveryConfirmationId: legacyConfirmation.id,
              attemptNumber: confirmationIndex + 1,
              status,
              submittedAt: legacyConfirmation.submittedAt ?? legacyConfirmation.receivedAt,
              submittedBy: legacyConfirmation.submittedBy ?? SYSTEM_USER,
              receiverName: legacyConfirmation.receiverName,
              receivedDate: legacyConfirmation.receivedAt.slice(0, 10),
              evidence: [],
              itemConfirmations,
            },
          ],
          activeAttemptId: attemptId,
          quantitySummary: {
            expectedShippedQuantity: expected,
            claimedReceivedQuantity: claimed,
            verifiedReceivedQuantity: verified,
            varianceQuantity: claimed - expected,
            hasPartialDelivery: claimed < expected,
          },
          notes: legacyConfirmation.remarks,
          audit,
          version: 1,
        });
      });
    });

    // --- Order request
    orderRequests.push({
      id: legacyOrder.id,
      orderRequestNumber: legacyOrder.id,
      clientPoNumber: legacyOrder.clientPO || null,
      tags: legacyOrder.tags,
      referenceLink: legacyOrder.referenceLink,
      client,
      project,
      vendor,
      requester: {
        userId: `user_${slug(legacyOrder.clientName ?? "unknown")}`,
        name: "",
        email: "",
        role: "CLIENT",
        organizationName: legacyOrder.clientEntityName,
      },
      source: legacyOrder.sourceType === "bulk_po_import" ? "BULK_IMPORT" : "LEGACY_MIGRATION",
      priority: "NORMAL",
      productionStatus: "NEW",
      distributionStatus: "NOT_STARTED",
      deadlineDate: legacyOrder.deadline,
      submittedAt: `${legacyOrder.createdDate}T00:00:00.000Z`,
      remarks: legacyOrder.note,
      externalReferences: legacyOrder.soNumber
        ? [{ type: "SALES_ORDER", value: legacyOrder.soNumber, sourceSystem: "MANUAL" }]
        : [],
      items,
      allocationIds: [],
      quantitySummary: {
        orderedQuantity: 0,
        allocatedQuantity: 0,
        shippedQuantity: 0,
        receivedQuantity: 0,
        outstandingToShipQuantity: 0,
        outstandingToReceiveQuantity: 0,
        productionReadyQuantity: 0,
        productionCompletionPercent: 0,
        deliveryProgressPercent: 0,
        salesPointCount: 0,
        salesPointsFullyReceived: 0,
        openPodIssueCount: 0,
      },
      documentSummary: {
        shipmentBatchCount: 0,
        deliveryNoteCount: 0,
        printedDeliveryNoteCount: 0,
        uploadedPodCount: 0,
        verifiedPodCount: 0,
        missingPodCount: 0,
        shippingLabelCount: 0,
        printedShippingLabelCount: 0,
      },
      exceptionSummary: { hasException: false, exceptionCount: 0 },
      audit,
      version: 1,
    });
  }

  // === New Order After Order Request (direct V2 seed — not migrated from legacy) ===
  const newOrderRequestId = "OR-2026-300001";
  const newOrderAudit = migrationAudit("2026-06-17T00:00:00.000Z");
  const newOrderClient: ClientReference = { id: "CUS-SAMPOERNA", name: "Sampoerna" };
  const newOrderProject: ProjectReference = { id: "project_c1-2026-tposm-poster-a3", name: "C1 - 2026 - TPOSM - Poster - A3 Size - Art Paper 150gsm - DSE12 25K (May)", clientId: newOrderClient.id };
  const newOrderVendor: VendorReference = { id: "SUP-004", name: "PT. HH Global Services Indonesia" };
  const newOrderSalesPoint = resolveSalesPoint("WH020");

  const newOrderItems: OrderItem[] = [
    {
      id: `${newOrderRequestId}::item-nr-01`,
      orderRequestId: newOrderRequestId,
      lineNumber: 1,
      product: productReference("2026-00195039-0030", "TPOSM - Poster - A3 Size - Art Paper 150gsm - DSE12 25K"),
      description: "TPOSM - Poster - A3 Size - Art Paper 150gsm - DSE12 25K",
      orderedQuantity: 500,
      unitOfMeasure: "PCS",
      productionStatus: "SUBMITTED",
      productionReadyQuantity: 0,
      productionCompletedQuantity: 0,
      allocatedQuantity: 500,
      shippedQuantity: 0,
      receivedQuantity: 0,
      remainingToAllocateQuantity: 0,
    },
    {
      id: `${newOrderRequestId}::item-nr-02`,
      orderRequestId: newOrderRequestId,
      lineNumber: 2,
      product: productReference("2026-00195039-0031", "GT SRC - Poster - A2 Size - Art Paper 150gsm - DSE12 25K"),
      description: "GT SRC - Poster - A2 Size - Art Paper 150gsm - DSE12 25K",
      orderedQuantity: 250,
      unitOfMeasure: "PCS",
      productionStatus: "SUBMITTED",
      productionReadyQuantity: 0,
      productionCompletedQuantity: 0,
      allocatedQuantity: 250,
      shippedQuantity: 0,
      receivedQuantity: 0,
      remainingToAllocateQuantity: 0,
    },
  ];

  for (const item of newOrderItems) {
    productionJobs.push({
      id: `${item.id}::job`,
      jobNumber: `JOB-${newOrderRequestId.replace(/^OR-/, "")}-${String(item.lineNumber).padStart(2, "0")}`,
      orderRequestId: newOrderRequestId,
      orderItemId: item.id,
      vendorId: "SUP-004",
      status: "SUBMITTED",
      orderedQuantity: item.orderedQuantity,
      producedQuantity: 0,
      reservedForShipmentQuantity: 0,
      completedQuantity: 0,
      reworkQuantity: 0,
      rejectedQuantity: 0,
      attachmentFileAssetIds: [],
      exceptionIds: [],
      audit: newOrderAudit,
      version: 1,
    });
  }

  const alloc1Id = `alloc-${newOrderRequestId}-01`;
  const alloc2Id = `alloc-${newOrderRequestId}-02`;

  allocations.push({
    id: alloc1Id,
    orderRequestId: newOrderRequestId,
    orderItemId: `${newOrderRequestId}::item-nr-01`,
    product: newOrderItems[0].product,
    salesPoint: {
      id: newOrderSalesPoint.id,
      code: newOrderSalesPoint.code,
      wCode: newOrderSalesPoint.wCode,
      name: newOrderSalesPoint.name,
      zone: newOrderSalesPoint.geography.zone,
      region: newOrderSalesPoint.geography.region,
      area: newOrderSalesPoint.geography.area,
      subArea: newOrderSalesPoint.geography.subArea,
    },
    allocatedQuantity: 500,
    shippedQuantity: 0,
    receivedQuantity: 0,
    outstandingQuantity: 500,
    remainingToReceiveQuantity: 500,
    status: "NOT_SHIPPED",
    podStatus: "NOT_STARTED",
    exceptionState: "NONE",
    batchIds: [],
    audit: newOrderAudit,
    version: 1,
  });

  allocations.push({
    id: alloc2Id,
    orderRequestId: newOrderRequestId,
    orderItemId: `${newOrderRequestId}::item-nr-02`,
    product: newOrderItems[1].product,
    salesPoint: {
      id: newOrderSalesPoint.id,
      code: newOrderSalesPoint.code,
      wCode: newOrderSalesPoint.wCode,
      name: newOrderSalesPoint.name,
      zone: newOrderSalesPoint.geography.zone,
      region: newOrderSalesPoint.geography.region,
      area: newOrderSalesPoint.geography.area,
      subArea: newOrderSalesPoint.geography.subArea,
    },
    allocatedQuantity: 250,
    shippedQuantity: 0,
    receivedQuantity: 0,
    outstandingQuantity: 250,
    remainingToReceiveQuantity: 250,
    status: "NOT_SHIPPED",
    podStatus: "NOT_STARTED",
    exceptionState: "NONE",
    batchIds: [],
    audit: newOrderAudit,
    version: 1,
  });

  orderRequests.push({
    id: newOrderRequestId,
    orderRequestNumber: newOrderRequestId,
    clientPoNumber: "30001001",
    tags: ["New Order", "Poster"],
    referenceLink: { url: "https://example.com/orders/OR-2026-300001", displayTitle: "Order request brief" },
    client: newOrderClient,
    project: newOrderProject,
    vendor: newOrderVendor,
    requester: { userId: "user_sampoerna", name: "", email: "", role: "CLIENT", organizationName: "PT HM Sampoerna Tbk" },
    source: "ADMIN_CREATE",
    priority: "NORMAL",
    productionStatus: "SUBMITTED",
    distributionStatus: "NOT_STARTED",
    deadlineDate: "2026-07-22",
    remarks: undefined,
    externalReferences: [{ type: "SALES_ORDER", value: "SO300001", sourceSystem: "MANUAL" }],
    items: newOrderItems,
    allocationIds: [alloc1Id, alloc2Id],
    quantitySummary: {
      orderedQuantity: 750,
      allocatedQuantity: 750,
      shippedQuantity: 0,
      receivedQuantity: 0,
      outstandingToShipQuantity: 750,
      outstandingToReceiveQuantity: 750,
      productionReadyQuantity: 0,
      productionCompletionPercent: 0,
      deliveryProgressPercent: 0,
      salesPointCount: 1,
      salesPointsFullyReceived: 0,
      openPodIssueCount: 0,
    },
    documentSummary: {
      shipmentBatchCount: 0,
      deliveryNoteCount: 0,
      printedDeliveryNoteCount: 0,
      uploadedPodCount: 0,
      verifiedPodCount: 0,
      missingPodCount: 0,
      shippingLabelCount: 0,
      printedShippingLabelCount: 0,
    },
    exceptionSummary: { hasException: false, exceptionCount: 0 },
    audit: newOrderAudit,
    version: 1,
  });

  cachedSeed = {
    salesPoints,
    orderRequests,
    allocations,
    productionJobs,
    shipmentBatches,
    deliveryNotes,
    deliveryConfirmations,
    policies: [defaultGlobalPolicy()],
  };
  return cachedSeed;
}

/** Test helper — clears the memoized seed so builders re-read legacy data. */
export function resetSeedCache(): void {
  cachedSeed = null;
}

/** Default GLOBAL workflow policy (CR-04). */
export function defaultGlobalPolicy(): WorkflowPolicy {
  return {
    id: "policy_global_default",
    name: "Global default policy",
    scope: "GLOBAL",
    effectiveFrom: "2026-01-01",
    orderRules: {
      clientPoRequired: true,
      allowUnderAllocationOnSubmit: true,
      requireUnderAllocationApproval: true,
      allowOrderAmendmentAfterShipment: false,
    },
    shipmentRules: {
      enforceProductionReadyQuantity: true,
      requireDeliveryNoteBeforeDispatch: true,
      requireLabelsBeforeDispatch: false,
      allowOverShipment: false,
      blockDispatchForMissingAddress: true,
      blockDispatchForMissingContact: false,
    },
    podRules: {
      podRequired: true,
      signedDeliveryNoteRequired: true,
      photoEvidenceRequired: false,
      allowOverReceipt: false,
      requireAdminOverageApproval: true,
      missingPodEscalationHours: 72,
    },
    documentRules: {
      oneActiveDeliveryNotePerBatch: true,
      allowVendorRegenerateDeliveryNote: false,
      requireAdminReasonForVoid: true,
      labelType: "PACKAGE",
    },
    exposureRules: {
      clientCanViewPodEvidence: true,
      clientCanViewDeliveryNotes: true,
      clientCanViewVendorName: true,
      analystCanExportEvidenceMetadata: true,
    },
    slaRules: {
      productionDueHours: 240,
      dispatchDueHours: 72,
      podDueHours: 72,
      exceptionResolutionDueHours: 96,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
  };
}
