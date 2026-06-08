import { useSyncExternalStore } from "react";
import * as XLSX from "xlsx";
import { getSalesPointCustomerBinding, mockSalesPoints, type SalesPointMapping } from "@/lib/mockData";
import { mockProducts } from "@/lib/productMaster";
import { getSupplierSnapshot } from "@/lib/supplierStore";
import { appendOrders, getOrdersSnapshot, type StoredOrder } from "@/lib/orderStore";
import { getOrderRequestStatus } from "@/lib/orderStatus";

export type ImportBatchStage = "Uploaded" | "Matched" | "Assignment in progress" | "Dispatched";
export type ImportRowStatus = "parsed" | "matched" | "unresolved" | "unassigned" | "assigned" | "excluded" | "dispatched";
export type DuplicateDecision = "pending" | "include" | "exclude";

export interface ImportRowRaw {
  poNumber: string;
  poLine: string;
  cycle: string;
  year: string;
  zone: string;
  region: string;
  area: string;
  wcode: string;
  salesPoint: string;
  itemName: string;
  category: string;
  itemCode: string;
  brand: string;
  brandSku: string;
  brandNamePo: string;
  length: string;
  width: string;
  quantity: string;
  orderDate: string;
  productionStartDate: string;
  productionFinishDate: string;
  shipmentDate: string;
  estReceivedDate: string;
  receivedDateBasedOnCpt: string;
  dnNumber: string;
  entity: string;
}

export interface ImportRowMatch {
  productCode: string | null;
  productName: string | null;
  salesPointId: string | null;
  salesPointName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerEntityName: string | null;
  brandName: string | null;
  categoryName: string | null;
  issues: string[];
}

export interface ImportRowAssignment {
  vendorId: string;
  vendorName: string;
  assignedAt: string;
  assignedBy: string;
}

export interface ImportBatchRow {
  id: string;
  sheetRowNumber: number;
  raw: ImportRowRaw;
  quantity: number;
  status: ImportRowStatus;
  match: ImportRowMatch;
  possibleDuplicate: boolean;
  duplicateKey: string;
  duplicateWith: string[];
  duplicateDecision: DuplicateDecision;
  assignment: ImportRowAssignment | null;
  excludedReason: string | null;
  dispatchedOrderId: string | null;
}

export interface DispatchRun {
  id: string;
  createdAt: string;
  createdBy: string;
  createdOrderIds: string[];
  skippedRowIds: string[];
}

export interface ImportBatch {
  id: string;
  fileName: string;
  sourceSheetName: string;
  sourceHeaderRowNumber?: number;
  uploadedBy: string;
  uploadedAt: string;
  stage: ImportBatchStage;
  progressPercent: number;
  rows: ImportBatchRow[];
  dispatchRuns: DispatchRun[];
}

export interface DispatchResult {
  createdOrders: StoredOrder[];
  createdOrderIds: string[];
  skippedRowIds: string[];
  unresolvedAssignedCount: number;
  pendingDuplicateCount: number;
  remainingUnassignedCount: number;
}

const STORAGE_KEY = "va-trace-import-batches";
const STORE_EVENT = "va-trace-import-batches:change";
let cachedBatches: ImportBatch[] | null = null;
let cachedStorageValue: string | null = null;

const expectedHeaders = [
  "PO Number",
  "PO Line",
  "Cycle",
  "Year",
  "Zone",
  "Region",
  "Area",
  "Wcode",
  "Sales Point",
  "Item Name",
  "Catergory",
  "Item Code",
  "Brand",
  "Brand SKU",
  "Brand Name PO",
  "Length",
  "Width",
  "Quantity",
  "Order Date",
  "Production Start Date",
  "Production Finish Date",
  "Shipment Date",
  "Est. Received Date",
  "Received Date Based on CPT",
  "DN Number",
  "Entity",
];

type SheetRowRecord = Record<string, string>;

export interface ParsedImportSheetRow {
  values: SheetRowRecord;
  sheetRowNumber: number;
}

export interface ParsedImportSheet {
  records: ParsedImportSheetRow[];
  headerRowNumber: number;
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function toIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function readStoredBatches(): ImportBatch[] {
  if (typeof window === "undefined") {
    return initialSeedBatches;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      cachedBatches = initialSeedBatches;
      cachedStorageValue = null;
      return initialSeedBatches;
    }

    if (stored === cachedStorageValue && cachedBatches) {
      return cachedBatches;
    }

    const parsed = JSON.parse(stored) as ImportBatch[];
    if (!Array.isArray(parsed)) {
      cachedBatches = initialSeedBatches;
      cachedStorageValue = null;
      return initialSeedBatches;
    }

    const legacySeedFileName = "Sampoerna-Jakarta-Dispatch.xlsx";
    const legacySeedSheetName = "Item Vendor Tracking";
    const legacySeedUploadedBy = "Customer Portal";

    const filtered = parsed.filter(
      (batch) =>
        !(
          batch.fileName === legacySeedFileName &&
          batch.sourceSheetName === legacySeedSheetName &&
          batch.uploadedBy === legacySeedUploadedBy
        ),
    );

    cachedBatches = filtered;
    cachedStorageValue = stored;
    return filtered;
  } catch {
    return initialSeedBatches;
  }
}

function writeStoredBatches(nextBatches: ImportBatch[]) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(nextBatches);
  cachedBatches = nextBatches;
  cachedStorageValue = serialized;
  window.localStorage.setItem(STORAGE_KEY, serialized);
  window.dispatchEvent(new Event(STORE_EVENT));
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleStoreEvent = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleStoreEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleStoreEvent);
  };
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function parseSheetRows(records: ParsedImportSheetRow[]) {
  return records
    .map((record) => buildImportRow(record.values, record.sheetRowNumber))
    .filter((row) => Object.values(row.raw).some((value) => value !== ""));
}

function buildImportRow(record: SheetRowRecord, sheetRowNumber: number): ImportBatchRow {
  const raw: ImportRowRaw = {
    poNumber: record["PO Number"] ?? "",
    poLine: record["PO Line"] ?? "",
    cycle: record["Cycle"] ?? "",
    year: record["Year"] ?? "",
    zone: record["Zone"] ?? "",
    region: record["Region"] ?? "",
    area: record["Area"] ?? "",
    wcode: record["Wcode"] ?? "",
    salesPoint: record["Sales Point"] ?? "",
    itemName: record["Item Name"] ?? "",
    category: record["Catergory"] ?? "",
    itemCode: record["Item Code"] ?? "",
    brand: record["Brand"] ?? "",
    brandSku: record["Brand SKU"] ?? "",
    brandNamePo: record["Brand Name PO"] ?? "",
    length: record["Length"] ?? "",
    width: record["Width"] ?? "",
    quantity: record["Quantity"] ?? "",
    orderDate: record["Order Date"] ?? "",
    productionStartDate: record["Production Start Date"] ?? "",
    productionFinishDate: record["Production Finish Date"] ?? "",
    shipmentDate: record["Shipment Date"] ?? "",
    estReceivedDate: record["Est. Received Date"] ?? "",
    receivedDateBasedOnCpt: record["Received Date Based on CPT"] ?? "",
    dnNumber: record["DN Number"] ?? "",
    entity: record["Entity"] ?? "",
  };

  const quantity = Number(raw.quantity) || 0;
  const match = resolveRowMatch(raw, quantity);
  const duplicateKey = [
    raw.poNumber,
    raw.poLine,
    raw.wcode,
    raw.itemCode,
    quantity.toString(),
  ]
    .map((part) => part.trim().toLowerCase())
    .join("|");
  const hasIssues = match.issues.length > 0;

  return {
    id: makeId("IMR"),
    sheetRowNumber,
    raw,
    quantity,
    status: hasIssues ? "unresolved" : "unassigned",
    match,
    possibleDuplicate: false,
    duplicateKey,
    duplicateWith: [],
    duplicateDecision: "pending",
    assignment: null,
    excludedReason: null,
    dispatchedOrderId: null,
  };
}

function resolveRowMatch(raw: ImportRowRaw, quantity: number): ImportRowMatch {
  const product =
    mockProducts.find((entry) => entry.code === raw.itemCode) ??
    mockProducts.find((entry) => entry.sourceName.toLowerCase() === raw.itemName.toLowerCase());
  const salesPoint =
    mockSalesPoints.find((entry) => entry.wcode === raw.wcode) ??
    mockSalesPoints.find((entry) => entry.salesPoint.toLowerCase() === raw.salesPoint.toLowerCase());
  const customerBinding = salesPoint ? getSalesPointCustomerBinding(salesPoint.wcode) : null;
  const issues: string[] = [];

  if (!raw.poNumber) issues.push("Missing PO Number");
  if (!raw.poLine) issues.push("Missing PO Line");
  if (!raw.wcode) issues.push("Missing Wcode");
  if (!raw.itemCode) issues.push("Missing Item Code");
  if (!raw.itemName) issues.push("Missing Item Name");
  if (!raw.quantity || quantity <= 0) issues.push("Quantity must be greater than zero");
  if (!salesPoint) issues.push("Sales point not found in master data");
  if (!product) issues.push("Item code not found in product master");
  if (salesPoint && raw.salesPoint && salesPoint.salesPoint.toLowerCase() !== raw.salesPoint.toLowerCase()) {
    issues.push("Sales point label does not match Wcode");
  }

  return {
    productCode: product?.code ?? null,
    productName: product?.name ?? null,
    salesPointId: salesPoint?.wcode ?? null,
    salesPointName: salesPoint?.salesPoint ?? null,
    customerId: customerBinding?.customerId ?? null,
    customerName: customerBinding?.customerName ?? null,
    customerEntityName: customerBinding?.customerEntityName ?? null,
    brandName: product?.brand ?? (raw.brand || null),
    categoryName: product?.productType ?? (raw.category || null),
    issues,
  };
}

function applyDuplicateFlags(rows: ImportBatchRow[]) {
  const existingOrderKeys = new Set(
    getOrdersSnapshot().flatMap((order) =>
      order.items.map((item) =>
        [
          order.clientPO,
          item.poLineNumber,
          order.salesPointId,
          item.productCode,
          item.quantity.toString(),
        ]
          .map((part) => part.trim().toLowerCase())
          .join("|"),
      ),
    ),
  );

  const groupedRows = rows.reduce<Record<string, string[]>>((accumulator, row) => {
    accumulator[row.duplicateKey] = [...(accumulator[row.duplicateKey] ?? []), row.id];
    return accumulator;
  }, {});

  return rows.map((row) => {
    const duplicateRowIds = groupedRows[row.duplicateKey].filter((id) => id !== row.id);
    const possibleDuplicate = existingOrderKeys.has(row.duplicateKey) || duplicateRowIds.length > 0;
    const duplicateWith = existingOrderKeys.has(row.duplicateKey) ? ["Existing order"] : duplicateRowIds;

    return {
      ...row,
      possibleDuplicate,
      duplicateWith,
      duplicateDecision: (possibleDuplicate ? "pending" : "include") as DuplicateDecision,
    };
  });
}

function findImportHeaderRow(rows: unknown[][]) {
  for (const [rowIndex, row] of rows.entries()) {
    const normalizedHeaders = row.map((value) => normalizeCellValue(value));
    const headerIndices = expectedHeaders.reduce<Record<string, number>>((accumulator, header) => {
      const index = normalizedHeaders.indexOf(header);

      if (index >= 0) {
        accumulator[header] = index;
      }

      return accumulator;
    }, {});

    if (expectedHeaders.every((header) => headerIndices[header] !== undefined)) {
      return {
        rowIndex,
        headerIndices,
      };
    }
  }

  return null;
}

function describeMissingHeaders(rows: unknown[][]) {
  const bestMatch = rows
    .map((row) => row.map((value) => normalizeCellValue(value)))
    .sort((left, right) => {
      const leftCount = expectedHeaders.filter((header) => left.includes(header)).length;
      const rightCount = expectedHeaders.filter((header) => right.includes(header)).length;
      return rightCount - leftCount;
    })[0] ?? [];

  return expectedHeaders.filter((header) => !bestMatch.includes(header));
}

export function extractImportRecordsFromWorksheet(sheet: XLSX.WorkSheet): ParsedImportSheet {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const headerMatch = findImportHeaderRow(rows);

  if (!headerMatch) {
    const missingHeaders = describeMissingHeaders(rows);
    throw new Error(`Template mismatch. Missing header(s): ${missingHeaders.join(", ")}`);
  }

  const records = rows.slice(headerMatch.rowIndex + 1).map((row, index) => {
    const values = Object.fromEntries(
      expectedHeaders.map((header) => [header, normalizeCellValue(row[headerMatch.headerIndices[header]])]),
    ) as SheetRowRecord;

    return {
      values,
      sheetRowNumber: headerMatch.rowIndex + index + 2,
    };
  });

  return {
    records,
    headerRowNumber: headerMatch.rowIndex + 1,
  };
}

export function buildImportBatch(
  fileName: string,
  sourceSheetName: string,
  uploadedBy: string,
  records: ParsedImportSheetRow[],
  sourceHeaderRowNumber?: number,
): ImportBatch {
  const parsedRows = parseSheetRows(records);
  const rows = applyDuplicateFlags(parsedRows);

  return {
    id: makeId("IMB"),
    fileName,
    sourceSheetName,
    sourceHeaderRowNumber,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    stage: "Assignment in progress",
    progressPercent: 100,
    rows,
    dispatchRuns: [],
  };
}

function buildInitialBatches() {
  return [];
}

const initialSeedBatches = buildInitialBatches();

function computeBatchStage(batch: ImportBatch): ImportBatchStage {
  if (batch.rows.every((row) => row.status === "dispatched" || row.status === "excluded")) {
    return "Dispatched";
  }

  if (batch.rows.some((row) => row.assignment || row.status === "assigned" || row.status === "unassigned")) {
    return "Assignment in progress";
  }

  if (batch.rows.some((row) => row.match.productCode || row.match.salesPointId)) {
    return "Matched";
  }

  return "Uploaded";
}

function syncBatch(batch: ImportBatch): ImportBatch {
  return {
    ...batch,
    stage: computeBatchStage(batch),
    progressPercent:
      batch.rows.length === 0
        ? 0
        : Math.round(
            (batch.rows.filter((row) => row.status === "assigned" || row.status === "dispatched" || row.status === "excluded").length /
              batch.rows.length) *
              100,
          ),
  };
}

function saveBatches(nextBatches: ImportBatch[]) {
  writeStoredBatches(nextBatches.map(syncBatch));
}

function updateBatchRows(
  batchId: string,
  updater: (rows: ImportBatchRow[]) => ImportBatchRow[],
) {
  const nextBatches = readStoredBatches().map((batch) =>
    batch.id === batchId
      ? syncBatch({
          ...batch,
          rows: updater(batch.rows),
        })
      : batch,
  );

  saveBatches(nextBatches);
}

function findSalesPointFromRow(row: ImportBatchRow): SalesPointMapping | undefined {
  return mockSalesPoints.find((entry) => entry.wcode === (row.match.salesPointId ?? row.raw.wcode));
}

function getBatchById(batchId: string) {
  return readStoredBatches().find((batch) => batch.id === batchId) ?? null;
}

export function getDispatchReadiness(batch: ImportBatch) {
  const assignedRows = batch.rows.filter(
    (row) => row.assignment && row.status !== "excluded" && row.status !== "dispatched",
  );
  const unresolvedAssignedRows = assignedRows.filter((row) => row.match.issues.length > 0);
  const pendingDuplicateRows = assignedRows.filter((row) => row.possibleDuplicate && row.duplicateDecision === "pending");
  const dispatchableRows = assignedRows.filter(
    (row) =>
      row.match.issues.length === 0 &&
      (!row.possibleDuplicate || row.duplicateDecision === "include") &&
      row.status === "assigned",
  );

  return {
    assignedRows,
    unresolvedAssignedRows,
    pendingDuplicateRows,
    dispatchableRows,
    remainingUnassignedCount: batch.rows.filter((row) => row.status === "unassigned").length,
  };
}

export function createOrdersFromDispatchableRows(batch: ImportBatch, dispatchableRows: ImportBatchRow[], dispatchRunId = "") {
  const groupedRows = dispatchableRows.reduce<Record<string, ImportBatchRow[]>>((accumulator, row) => {
    const salesPointId = row.match.salesPointId ?? row.raw.wcode;
    const customerId = row.match.customerId ?? getSalesPointCustomerBinding(salesPointId)?.customerId ?? "";
    const key = `${row.raw.poNumber}::${salesPointId}::${customerId}::${row.assignment?.vendorId}`;
    accumulator[key] = [...(accumulator[key] ?? []), row];
    return accumulator;
  }, {});

  return Object.values(groupedRows).map((rows) => {
    const firstRow = rows[0];
    const vendor = firstRow.assignment!;
    const salesPointId = firstRow.match.salesPointId ?? firstRow.raw.wcode;
    const customerBinding = firstRow.match.customerId
      ? {
          customerId: firstRow.match.customerId,
          customerName: firstRow.match.customerName,
          customerEntityName: firstRow.match.customerEntityName,
        }
      : getSalesPointCustomerBinding(salesPointId);
    const sourcePoNumber = firstRow.raw.poNumber;
    const topProgramName = rows.reduce<Record<string, number>>((accumulator, row) => {
      const key = row.raw.brandNamePo || row.raw.brand || "Imported Program";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    const campaign = Object.entries(topProgramName).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Imported Program";
    const id = `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const items = rows.map((row) => ({
      id: makeId("ITEM"),
      productCode: row.match.productCode ?? row.raw.itemCode,
      poLineNumber: row.raw.poLine,
      name: row.match.productName ?? row.raw.itemName,
      quantity: row.quantity,
      deliveredQuantity: 0,
      status: "Created" as const,
      sourceBatchId: batch.id,
      sourceRowId: row.id,
      sourcePoNumber: row.raw.poNumber,
      brandNamePo: row.raw.brandNamePo,
    }));

    return {
      id,
      campaign: `Imported ${campaign}`,
      status: getOrderRequestStatus(items),
      createdDate: toIsoDate(),
      deadline: "14 days left",
      clientPO: sourcePoNumber,
      soNumber: "",
      supplier: vendor.vendorName,
      salesPointId,
      customerId: customerBinding?.customerId ?? undefined,
      customerName: customerBinding?.customerName ?? undefined,
      customerEntityName: customerBinding?.customerEntityName ?? undefined,
      picProgram: {
        name: "",
        email: "",
      },
      sourceType: "bulk_po_import" as const,
      importBatchId: batch.id,
      importRowIds: rows.map((row) => row.id),
      assignedVendorId: vendor.vendorId,
      dispatchRunId,
      importPoNumbers: [sourcePoNumber],
      items,
    } satisfies StoredOrder;
  });
}

function dispatchAssignedRows(batchId: string): DispatchResult {
  const batch = getBatchById(batchId);

  if (!batch) {
    return {
      createdOrders: [],
      createdOrderIds: [],
      skippedRowIds: [],
      unresolvedAssignedCount: 0,
      pendingDuplicateCount: 0,
      remainingUnassignedCount: 0,
    };
  }

  const createdAt = new Date().toISOString();
  const createdBy = "Admin Dispatch Workspace";
  const dispatchRunId = makeId("DSP");
  const {
    unresolvedAssignedRows,
    pendingDuplicateRows,
    dispatchableRows,
    remainingUnassignedCount,
  } = getDispatchReadiness(batch);
  const finalOrders = createOrdersFromDispatchableRows(batch, dispatchableRows, dispatchRunId);
  appendOrders(finalOrders);

  const dispatchedRowIds = new Set(dispatchableRows.map((row) => row.id));
  const skippedRowIds = [
    ...unresolvedAssignedRows.map((row) => row.id),
    ...pendingDuplicateRows.map((row) => row.id),
  ];

  const nextBatches = readStoredBatches().map((storedBatch) => {
    if (storedBatch.id !== batch.id) {
      return storedBatch;
    }

    return syncBatch({
      ...storedBatch,
      rows: storedBatch.rows.map((row) => {
        if (dispatchedRowIds.has(row.id)) {
          const targetOrder = finalOrders.find((order) => order.importRowIds?.includes(row.id));

          return {
            ...row,
            status: "dispatched",
            dispatchedOrderId: targetOrder?.id ?? null,
          };
        }

        return row;
      }),
      dispatchRuns: [
        {
          id: dispatchRunId,
          createdAt,
          createdBy,
          createdOrderIds: finalOrders.map((order) => order.id),
          skippedRowIds,
        },
        ...storedBatch.dispatchRuns,
      ],
    });
  });

  saveBatches(nextBatches);

  return {
    createdOrders: finalOrders,
    createdOrderIds: finalOrders.map((order) => order.id),
    skippedRowIds,
    unresolvedAssignedCount: unresolvedAssignedRows.length,
    pendingDuplicateCount: pendingDuplicateRows.length,
    remainingUnassignedCount,
  };
}

export function getImportBatchesSnapshot() {
  return readStoredBatches();
}

export function useImportBatches() {
  return useSyncExternalStore(subscribe, readStoredBatches, () => initialSeedBatches);
}

export function useImportStore() {
  const batches = useImportBatches();

  const uploadWorkbook = async (file: File, uploadedBy = "Customer Portal") => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Workbook has no sheets.");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const parsedSheet = extractImportRecordsFromWorksheet(firstSheet);
    const nextBatch = buildImportBatch(file.name, firstSheetName, uploadedBy, parsedSheet.records, parsedSheet.headerRowNumber);

    saveBatches([nextBatch, ...readStoredBatches()]);
    return nextBatch;
  };

  const assignRowsToVendor = (batchId: string, rowIds: string[], vendorId: string) => {
    const vendor = getSupplierSnapshot().find((entry) => entry.id === vendorId);

    if (!vendor || rowIds.length === 0) {
      return;
    }

    updateBatchRows(batchId, (rows) =>
      rows.map((row) => {
        if (!rowIds.includes(row.id) || row.status === "excluded" || row.status === "dispatched") {
          return row;
        }

        return {
          ...row,
          status: row.match.issues.length > 0 ? "unresolved" : "assigned",
          assignment: {
            vendorId: vendor.id,
            vendorName: vendor.name,
            assignedAt: new Date().toISOString(),
            assignedBy: "Admin Dispatch Workspace",
          },
        };
      }),
    );
  };

  const unassignRows = (batchId: string, rowIds: string[]) => {
    updateBatchRows(batchId, (rows) =>
      rows.map((row) => {
        if (!rowIds.includes(row.id) || row.status === "excluded" || row.status === "dispatched") {
          return row;
        }

        return {
          ...row,
          assignment: null,
          status: row.match.issues.length > 0 ? "unresolved" : "unassigned",
        };
      }),
    );
  };

  const markDuplicateDecision = (batchId: string, rowId: string, decision: DuplicateDecision) => {
    updateBatchRows(batchId, (rows) =>
      rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              duplicateDecision: decision,
              status: decision === "exclude" ? "excluded" : row.assignment ? "assigned" : row.match.issues.length > 0 ? "unresolved" : "unassigned",
              excludedReason: decision === "exclude" ? "Excluded during duplicate review" : null,
            }
          : row,
      ),
    );
  };

  const toggleExcluded = (batchId: string, rowId: string, excluded: boolean) => {
    updateBatchRows(batchId, (rows) =>
      rows.map((row) => {
        if (row.id !== rowId || row.status === "dispatched") {
          return row;
        }

        if (excluded) {
          return {
            ...row,
            status: "excluded",
            excludedReason: "Excluded from import scope",
          };
        }

        return {
          ...row,
          status: row.match.issues.length > 0 ? "unresolved" : row.assignment ? "assigned" : "unassigned",
          excludedReason: null,
        };
      }),
    );
  };

  const dispatchBatch = (batchId: string) => dispatchAssignedRows(batchId);

  return {
    batches,
    uploadWorkbook,
    assignRowsToVendor,
    unassignRows,
    markDuplicateDecision,
    toggleExcluded,
    dispatchBatch,
  };
}

export function getImportBatchSummary(batch: ImportBatch) {
  const rows = batch.rows;

  return {
    totalRows: rows.length,
    unresolvedRows: rows.filter((row) => row.match.issues.length > 0 && row.status !== "excluded" && row.status !== "dispatched").length,
    unassignedRows: rows.filter((row) => row.status === "unassigned").length,
    assignedRows: rows.filter((row) => row.status === "assigned").length,
    duplicateRows: rows.filter((row) => row.possibleDuplicate && row.status !== "excluded").length,
    excludedRows: rows.filter((row) => row.status === "excluded").length,
    dispatchedRows: rows.filter((row) => row.status === "dispatched").length,
  };
}
