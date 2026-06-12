import { useSyncExternalStore } from "react";
import * as XLSX from "xlsx";
import { getSalesPointClientBinding, mockSalesPoints } from "@/lib/mockData";
import type { SalesPointMapping } from "@/lib/types";
import { normalizeOrder } from "@/lib/orderDomain";
import { findProductForImport, upsertProvisionalProductsFromImportRows } from "@/lib/productMaster";
import { getSupplierSnapshot } from "@/lib/supplierStore";
import { appendOrders, getOrdersSnapshot, type StoredOrder } from "@/lib/orderStore";
import { getOrderRequestStatus } from "@/lib/orderStatus";

export type ImportBatchStage = "Uploaded" | "Matched" | "Assignment in progress" | "Dispatched";
export type ImportRowStatus = "parsed" | "matched" | "unresolved" | "unassigned" | "assigned" | "excluded" | "dispatched";
export type DuplicateDecision = "pending" | "include" | "exclude";
export type ImportValidationStatus = "blocked" | "ready_for_assignment" | "ready_for_import" | "importing" | "imported" | "failed";
export type ImportJobStatus = "idle" | "importing" | "imported" | "failed";

export const MANDATORY_IMPORT_FIELDS = [
  "PO Number",
  "PO Line",
  "Wcode",
  "Sales Point",
  "Item Code",
  "Item Name",
  "Quantity",
] as const;

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
  clientId: string | null;
  clientName: string | null;
  clientEntityName: string | null;
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

export type ImportAssignmentRuleField = "region" | "brand" | "category" | "salesPoint";

export interface ImportAssignmentRuleCondition {
  field: ImportAssignmentRuleField;
  value: string;
}

export interface ImportAssignmentRule {
  id: string;
  vendorId: string;
  vendorName: string;
  conditions: ImportAssignmentRuleCondition[];
  createdAt: string;
}

export interface ImportAssignmentDraftMatch {
  rowId: string;
  ruleId: string;
  vendorId: string;
  vendorName: string;
}

export interface ImportAssignmentDraft {
  generatedAt: string;
  matchedRows: ImportAssignmentDraftMatch[];
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
  idempotencyKey: string;
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
  completedGroupKeys: string[];
  skippedRowIds: string[];
  skippedExistingOrderIds: string[];
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  progressPercent: number;
  createdOrderIds: string[];
  completedRowIds: string[];
  failedRowIds: string[];
  lastError: string | null;
  retryCount: number;
  updatedAt: string;
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
  validationStatus: ImportValidationStatus;
  importJob: ImportJob | null;
  assignmentRules: ImportAssignmentRule[];
  assignmentDraft: ImportAssignmentDraft | null;
  rows: ImportBatchRow[];
  dispatchRuns: DispatchRun[];
}

export interface DispatchResult {
  createdOrders: StoredOrder[];
  createdOrderIds: string[];
  skippedExistingOrderIds: string[];
  skippedRowIds: string[];
  unresolvedAssignedCount: number;
  pendingDuplicateCount: number;
  remainingUnassignedCount: number;
}

const STORAGE_KEY = "va-trace-import-batches";
const STORE_EVENT = "va-trace-import-batches:change";
const IMPORT_BATCH_DB_NAME = "va-trace-import-batches-db";
const IMPORT_BATCH_STORE_NAME = "batches";
const IMPORT_QUEUE_RESET_KEY = "va-trace-import-batches-reset";

let cachedBatches: ImportBatch[] = [];
let cacheHydrated = typeof window === "undefined";
let hydrationPromise: Promise<void> | null = null;
let databasePromise: Promise<IDBDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

interface ImportStoreSnapshot {
  batches: ImportBatch[];
  isHydrating: boolean;
}

let cachedSnapshot: ImportStoreSnapshot = {
  batches: cachedBatches,
  isHydrating: !cacheHydrated,
};

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

function sortBatches(batches: ImportBatch[]) {
  return [...batches].sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
}

function emitStoreChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(STORE_EVENT));
}

function updateSnapshotCache() {
  cachedSnapshot = {
    batches: cachedBatches,
    isHydrating: !cacheHydrated,
  };
}

function getSnapshot() {
  return cachedSnapshot;
}

function openImportBatchDatabase() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser."));
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(IMPORT_BATCH_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(IMPORT_BATCH_STORE_NAME)) {
        database.createObjectStore(IMPORT_BATCH_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to open import batch database."));
  });

  return databasePromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return openImportBatchDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(IMPORT_BATCH_STORE_NAME, mode);
        const store = transaction.objectStore(IMPORT_BATCH_STORE_NAME);

        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
        operation(store, resolve, reject);
      }),
  );
}

function readAllBatchesFromIndexedDb() {
  return runTransaction<ImportBatch[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(sortBatches((request.result as ImportBatch[]) ?? []));
    request.onerror = () => reject(request.error ?? new Error("Failed to read import batches."));
  });
}

function putBatchIntoIndexedDb(batch: ImportBatch) {
  return runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(batch);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to save import batch."));
  });
}

function replaceIndexedDbBatches(nextBatches: ImportBatch[]) {
  return runTransaction<void>("readwrite", (store, resolve, reject) => {
    const clearRequest = store.clear();

    clearRequest.onerror = () => reject(clearRequest.error ?? new Error("Failed to reset import batches."));
    clearRequest.onsuccess = () => {
      if (nextBatches.length === 0) {
        resolve();
        return;
      }

      let completed = 0;
      let rejected = false;

      nextBatches.forEach((batch) => {
        const request = store.put(batch);
        request.onerror = () => {
          if (!rejected) {
            rejected = true;
            reject(request.error ?? new Error("Failed to write import batches."));
          }
        };
        request.onsuccess = () => {
          completed += 1;
          if (!rejected && completed === nextBatches.length) {
            resolve();
          }
        };
      });
    };
  });
}

function readLegacyLocalStorageBatches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as ImportBatch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shouldSeedInitialBatches() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(IMPORT_QUEUE_RESET_KEY) !== "true";
}

function markImportQueueAsReset() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(IMPORT_QUEUE_RESET_KEY, "true");
}

function unmarkImportQueueAsReset() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(IMPORT_QUEUE_RESET_KEY);
}

async function migrateLegacyLocalStorageIfNeeded() {
  const legacyBatches = readLegacyLocalStorageBatches();

  if (legacyBatches.length === 0) {
    return;
  }

  const currentBatches = await readAllBatchesFromIndexedDb();

  if (currentBatches.length === 0) {
    await replaceIndexedDbBatches(legacyBatches.map(syncBatch));
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

async function hydrateImportBatchCache() {
  if (typeof window === "undefined") {
    cacheHydrated = true;
    return;
  }

  try {
    await migrateLegacyLocalStorageIfNeeded();
    cachedBatches = await readAllBatchesFromIndexedDb();
    if (cachedBatches.length === 0 && shouldSeedInitialBatches()) {
      cachedBatches = initialSeedBatches;
    }
  } catch (error) {
    console.error("Failed to hydrate import batches from IndexedDB.", error);
    cachedBatches = shouldSeedInitialBatches() ? initialSeedBatches : [];
  } finally {
    cacheHydrated = true;
    updateSnapshotCache();
    emitStoreChange();
  }
}

function ensureImportBatchCacheHydrated() {
  if (cacheHydrated) {
    return Promise.resolve();
  }

  if (!hydrationPromise) {
    hydrationPromise = hydrateImportBatchCache();
  }

  return hydrationPromise;
}

function enqueueWrite(task: () => Promise<void>) {
  const queuedTask = writeQueue.then(task, task);
  writeQueue = queuedTask.catch(() => undefined);
  return queuedTask;
}

function readStoredBatches(): ImportBatch[] {
  if (typeof window === "undefined") {
    return initialSeedBatches;
  }

  void ensureImportBatchCacheHydrated();
  return cachedBatches;
}

function writeStoredBatches(nextBatches: ImportBatch[]) {
  if (typeof window === "undefined") {
    return;
  }

  cachedBatches = sortBatches(nextBatches.map(syncBatch));
  updateSnapshotCache();
  emitStoreChange();
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStoreEvent = () => listener();

  window.addEventListener(STORE_EVENT, handleStoreEvent);
  void ensureImportBatchCacheHydrated();

  return () => {
    window.removeEventListener(STORE_EVENT, handleStoreEvent);
  };
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeKeyPart(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isRowAssignable(row: ImportBatchRow) {
  return (
    row.status === "unassigned" &&
    row.match.issues.length === 0 &&
    (!row.possibleDuplicate || row.duplicateDecision === "include")
  );
}

function getRuleFieldValue(row: ImportBatchRow, field: ImportAssignmentRuleField) {
  if (field === "region") {
    return row.raw.region;
  }

  if (field === "brand") {
    return row.raw.brandNamePo || row.raw.brand || row.match.brandName || "";
  }

  if (field === "category") {
    return row.raw.category || row.match.categoryName || "";
  }

  return `${row.raw.wcode} · ${row.raw.salesPoint}`;
}

function buildAssignmentDraft(batch: ImportBatch): ImportAssignmentDraft | null {
  if (batch.assignmentRules.length === 0) {
    return null;
  }

  const matchedRows = batch.rows.reduce<ImportAssignmentDraftMatch[]>((accumulator, row) => {
    if (!isRowAssignable(row)) {
      return accumulator;
    }

    const matchedRule = batch.assignmentRules.find((rule) =>
      rule.conditions.every((condition) => normalizeKeyPart(getRuleFieldValue(row, condition.field)) === normalizeKeyPart(condition.value)),
    );

    if (!matchedRule) {
      return accumulator;
    }

    accumulator.push({
      rowId: row.id,
      ruleId: matchedRule.id,
      vendorId: matchedRule.vendorId,
      vendorName: matchedRule.vendorName,
    });

    return accumulator;
  }, []);

  return matchedRows.length > 0
    ? {
        generatedAt: new Date().toISOString(),
        matchedRows,
      }
    : null;
}

function buildMandatoryDuplicateKey(raw: ImportRowRaw, quantity: number) {
  return [
    raw.poNumber,
    raw.poLine,
    raw.wcode,
    raw.salesPoint,
    raw.itemCode,
    raw.itemName,
    quantity.toString(),
  ]
    .map(normalizeKeyPart)
    .join("|");
}

function makeRowIdempotencyKey(batchId: string, row: Pick<ImportBatchRow, "duplicateKey" | "sheetRowNumber">) {
  return [batchId, row.duplicateKey, row.sheetRowNumber.toString()].map(normalizeKeyPart).join("::");
}

function parseSheetRows(records: ParsedImportSheetRow[]) {
  return records
    .map((record) => buildImportRow(record.values, record.sheetRowNumber))
    .filter((row) => Object.values(row.raw).some((value) => value !== ""));
}

function recordToProvisionalProductInput(record: SheetRowRecord) {
  return {
    code: record["Item Code"] ?? "",
    itemName: record["Item Name"] ?? "",
    category: record["Catergory"] ?? "",
    brand: record["Brand"] ?? "",
    brandSku: record["Brand SKU"] ?? "",
    brandNamePo: record["Brand Name PO"] ?? "",
    length: record["Length"] ?? "",
    width: record["Width"] ?? "",
  };
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
  const duplicateKey = buildMandatoryDuplicateKey(raw, quantity);
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
    idempotencyKey: "",
    duplicateWith: [],
    duplicateDecision: "pending",
    assignment: null,
    excludedReason: null,
    dispatchedOrderId: null,
  };
}

function resolveRowMatch(raw: ImportRowRaw, quantity: number): ImportRowMatch {
  const product = findProductForImport(raw.itemCode, raw.itemName);
  const salesPoint =
    mockSalesPoints.find((entry) => entry.wcode === raw.wcode) ??
    mockSalesPoints.find((entry) => entry.salesPoint.toLowerCase() === raw.salesPoint.toLowerCase());
  const clientBinding = salesPoint ? getSalesPointClientBinding(salesPoint.wcode) : null;
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
    clientId: clientBinding?.clientId ?? null,
    clientName: clientBinding?.clientName ?? null,
    clientEntityName: clientBinding?.clientEntityName ?? null,
    brandName: product?.brand ?? (raw.brand || null),
    categoryName: product?.productType ?? (raw.category || null),
    issues,
  };
}

function applyDuplicateFlags(rows: ImportBatchRow[]) {
  const existingOrderKeys = new Set(
    getOrdersSnapshot().flatMap((order) =>
      order.items.map((item) => {
        const salesPointName = mockSalesPoints.find((entry) => entry.wcode === order.salesPointId)?.salesPoint ?? order.salesPointId;

        return [
          order.clientPO,
          item.poLineNumber,
          order.salesPointId,
          salesPointName,
          item.productCode,
          item.name,
          item.quantity.toString(),
        ]
          .map(normalizeKeyPart)
          .join("|");
      }),
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
  upsertProvisionalProductsFromImportRows(records.map((record) => recordToProvisionalProductInput(record.values)));
  const parsedRows = parseSheetRows(records);
  const id = makeId("IMB");
  const rows = applyDuplicateFlags(parsedRows).map((row) => ({
    ...row,
    idempotencyKey: makeRowIdempotencyKey(id, row),
  }));
  const hasBlockers = rows.some((row) => row.match.issues.length > 0 || (row.possibleDuplicate && row.duplicateDecision === "pending"));

  return {
    id,
    fileName,
    sourceSheetName,
    sourceHeaderRowNumber,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
    stage: "Assignment in progress",
    progressPercent: 100,
    validationStatus: hasBlockers ? "blocked" : "ready_for_assignment",
    importJob: null,
    assignmentRules: [],
    assignmentDraft: null,
    rows,
    dispatchRuns: [],
  };
}

function buildInitialBatches(): ImportBatch[] {
  const uploadedAt = "2026-06-08T13:44:34.000Z";

  return [
    {
      id: "IMB-DEMO-001",
      fileName: "Sampling Data for System Demo (1).xlsx",
      sourceSheetName: "Item Vendor Tracking",
      sourceHeaderRowNumber: 3,
      uploadedBy: "Operations Desk",
      uploadedAt,
      stage: "Assignment in progress",
      progressPercent: 40,
      validationStatus: "blocked",
      importJob: null,
      assignmentRules: [],
      assignmentDraft: null,
      dispatchRuns: [],
      rows: [
        {
          id: "IMR-001",
          sheetRowNumber: 12,
          raw: {
            poNumber: "5701713444",
            poLine: "1",
            cycle: "Cycle 3",
            year: "2026",
            zone: "West",
            region: "Jakarta Inner",
            area: "Depok",
            wcode: "WH059",
            salesPoint: "Depok",
            itemName: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
            category: "POSM",
            itemCode: "TPOSM-SC-001",
            brand: "Sunscreen",
            brandSku: "SC-001",
            brandNamePo: "DPP12 20K",
            length: "0.5",
            width: "1",
            quantity: "10",
            orderDate: "2026-06-02",
            productionStartDate: "2026-06-06",
            productionFinishDate: "2026-06-10",
            shipmentDate: "2026-06-12",
            estReceivedDate: "2026-06-14",
            receivedDateBasedOnCpt: "",
            dnNumber: "",
            entity: "PT HM Sampoerna Tbk",
          },
          quantity: 10,
          status: "unassigned",
          match: {
            productCode: "TPOSM-SC-001",
            productName: "TPOSM - Sunscreen Without Velcro - 0.5x1 m - Vinyl FF Frontlight 10 Oz - DPP12 20K",
            salesPointId: "WH059",
            salesPointName: "Depok",
            clientId: "CLNT-001",
            clientName: "Sampoerna",
            clientEntityName: "PT HM Sampoerna Tbk",
            brandName: "Sunscreen",
            categoryName: "POSM",
            issues: [],
          },
          possibleDuplicate: false,
          duplicateKey: "5701713444|1|wh059|tposm-sc-001|10",
          idempotencyKey: "imb-demo-001::5701713444|1|wh059|tposm-sc-001|10::12",
          duplicateWith: [],
          duplicateDecision: "include",
          assignment: null,
          excludedReason: null,
          dispatchedOrderId: null,
        },
        {
          id: "IMR-002",
          sheetRowNumber: 13,
          raw: {
            poNumber: "5701713444",
            poLine: "2",
            cycle: "Cycle 3",
            year: "2026",
            zone: "West",
            region: "Jakarta Inner",
            area: "Depok",
            wcode: "WH059",
            salesPoint: "Depok",
            itemName: "Shelf Strip Highlight",
            category: "POSM",
            itemCode: "TPOSM-AM-024",
            brand: "A Mild",
            brandSku: "AM-024",
            brandNamePo: "A Mild",
            length: "1",
            width: "0.2",
            quantity: "24",
            orderDate: "2026-06-02",
            productionStartDate: "2026-06-06",
            productionFinishDate: "2026-06-10",
            shipmentDate: "2026-06-12",
            estReceivedDate: "2026-06-14",
            receivedDateBasedOnCpt: "",
            dnNumber: "",
            entity: "PT HM Sampoerna Tbk",
          },
          quantity: 24,
          status: "assigned",
          match: {
            productCode: "TPOSM-AM-024",
            productName: "Shelf Strip Highlight",
            salesPointId: "WH059",
            salesPointName: "Depok",
            clientId: "CLNT-001",
            clientName: "Sampoerna",
            clientEntityName: "PT HM Sampoerna Tbk",
            brandName: "A Mild",
            categoryName: "POSM",
            issues: [],
          },
          possibleDuplicate: false,
          duplicateKey: "5701713444|2|wh059|tposm-am-024|24",
          idempotencyKey: "imb-demo-001::5701713444|2|wh059|tposm-am-024|24::13",
          duplicateWith: [],
          duplicateDecision: "include",
          assignment: {
            vendorId: "SUP-004",
            vendorName: "PT. HH Global Services Indonesia",
            assignedAt: uploadedAt,
            assignedBy: "Admin Dispatch Workspace",
          },
          excludedReason: null,
          dispatchedOrderId: null,
        },
        {
          id: "IMR-003",
          sheetRowNumber: 14,
          raw: {
            poNumber: "5701713499",
            poLine: "1",
            cycle: "Cycle 3",
            year: "2026",
            zone: "West",
            region: "Jakarta Outer",
            area: "Bogor",
            wcode: "WH021",
            salesPoint: "Bogor",
            itemName: "Counter Display Kit",
            category: "Display",
            itemCode: "TPOSM-CD-404",
            brand: "Dji Sam Soe",
            brandSku: "DSS-404",
            brandNamePo: "Dji Sam Soe",
            length: "1",
            width: "1",
            quantity: "6",
            orderDate: "2026-06-03",
            productionStartDate: "2026-06-07",
            productionFinishDate: "2026-06-11",
            shipmentDate: "2026-06-13",
            estReceivedDate: "2026-06-15",
            receivedDateBasedOnCpt: "",
            dnNumber: "",
            entity: "PT HM Sampoerna Tbk",
          },
          quantity: 6,
          status: "unresolved",
          match: {
            productCode: null,
            productName: null,
            salesPointId: "WH021",
            salesPointName: "Bogor",
            clientId: "CLNT-001",
            clientName: "Sampoerna",
            clientEntityName: "PT HM Sampoerna Tbk",
            brandName: "Dji Sam Soe",
            categoryName: "Display",
            issues: ["Item code not found in product master", "Review vendor-ready substitute"],
          },
          possibleDuplicate: false,
          duplicateKey: "5701713499|1|wh021|tposm-cd-404|6",
          idempotencyKey: "imb-demo-001::5701713499|1|wh021|tposm-cd-404|6::14",
          duplicateWith: [],
          duplicateDecision: "include",
          assignment: {
            vendorId: "SUP-002",
            vendorName: "RouteCraft Visual",
            assignedAt: uploadedAt,
            assignedBy: "Admin Dispatch Workspace",
          },
          excludedReason: null,
          dispatchedOrderId: null,
        },
        {
          id: "IMR-004",
          sheetRowNumber: 15,
          raw: {
            poNumber: "5701713503",
            poLine: "1",
            cycle: "Cycle 3",
            year: "2026",
            zone: "West",
            region: "Jakarta Inner",
            area: "Menteng",
            wcode: "WH001",
            salesPoint: "Menteng",
            itemName: "Hanging Mobile Banner",
            category: "POSM",
            itemCode: "TPOSM-HM-018",
            brand: "Marlboro",
            brandSku: "MB-018",
            brandNamePo: "Marlboro",
            length: "1",
            width: "0.4",
            quantity: "18",
            orderDate: "2026-06-03",
            productionStartDate: "2026-06-07",
            productionFinishDate: "2026-06-11",
            shipmentDate: "2026-06-13",
            estReceivedDate: "2026-06-15",
            receivedDateBasedOnCpt: "",
            dnNumber: "",
            entity: "PT HM Sampoerna Tbk",
          },
          quantity: 18,
          status: "assigned",
          match: {
            productCode: "TPOSM-HM-018",
            productName: "Hanging Mobile Banner",
            salesPointId: "WH001",
            salesPointName: "Menteng",
            clientId: "CLNT-001",
            clientName: "Sampoerna",
            clientEntityName: "PT HM Sampoerna Tbk",
            brandName: "Marlboro",
            categoryName: "POSM",
            issues: [],
          },
          possibleDuplicate: true,
          duplicateKey: "5701713503|1|wh001|tposm-hm-018|18",
          idempotencyKey: "imb-demo-001::5701713503|1|wh001|tposm-hm-018|18::15",
          duplicateWith: ["Existing order"],
          duplicateDecision: "pending",
          assignment: {
            vendorId: "SUP-003",
            vendorName: "Metro Printworks",
            assignedAt: uploadedAt,
            assignedBy: "Admin Dispatch Workspace",
          },
          excludedReason: null,
          dispatchedOrderId: null,
        },
        {
          id: "IMR-005",
          sheetRowNumber: 16,
          raw: {
            poNumber: "5701713510",
            poLine: "1",
            cycle: "Cycle 3",
            year: "2026",
            zone: "Central",
            region: "Bandung",
            area: "Bandung",
            wcode: "WH077",
            salesPoint: "Bandung",
            itemName: "Window Takeover Strip",
            category: "POSM",
            itemCode: "TPOSM-WT-014",
            brand: "Sampoerna Kretek",
            brandSku: "SK-014",
            brandNamePo: "Sampoerna Kretek",
            length: "2",
            width: "0.3",
            quantity: "14",
            orderDate: "2026-06-04",
            productionStartDate: "2026-06-08",
            productionFinishDate: "2026-06-12",
            shipmentDate: "2026-06-14",
            estReceivedDate: "2026-06-16",
            receivedDateBasedOnCpt: "",
            dnNumber: "",
            entity: "PT HM Sampoerna Tbk",
          },
          quantity: 14,
          status: "dispatched",
          match: {
            productCode: "TPOSM-WT-014",
            productName: "Window Takeover Strip",
            salesPointId: "WH077",
            salesPointName: "Bandung",
            clientId: "CLNT-001",
            clientName: "Sampoerna",
            clientEntityName: "PT HM Sampoerna Tbk",
            brandName: "Sampoerna Kretek",
            categoryName: "POSM",
            issues: [],
          },
          possibleDuplicate: false,
          duplicateKey: "5701713510|1|wh077|tposm-wt-014|14",
          idempotencyKey: "imb-demo-001::5701713510|1|wh077|tposm-wt-014|14::16",
          duplicateWith: [],
          duplicateDecision: "include",
          assignment: {
            vendorId: "SUP-004",
            vendorName: "PT. HH Global Services Indonesia",
            assignedAt: uploadedAt,
            assignedBy: "Admin Dispatch Workspace",
          },
          excludedReason: null,
          dispatchedOrderId: "OR-2026-555555",
        },
      ],
    },
  ];
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

function computeValidationStatus(batch: ImportBatch): ImportValidationStatus {
  if (batch.importJob?.status === "importing") {
    return "importing";
  }

  if (batch.importJob?.status === "failed") {
    return "failed";
  }

  const activeRows = batch.rows.filter((row) => row.status !== "excluded");
  const unresolvedRows = activeRows.filter((row) => row.match.issues.length > 0 && row.status !== "dispatched");
  const pendingDuplicateRows = activeRows.filter((row) => row.possibleDuplicate && row.duplicateDecision === "pending" && row.status !== "dispatched");
  const remainingUnassignedRows = activeRows.filter((row) => row.status === "unassigned");
  const assignedRows = activeRows.filter((row) => row.status === "assigned");

  if (activeRows.length > 0 && activeRows.every((row) => row.status === "dispatched")) {
    return "imported";
  }

  if (unresolvedRows.length > 0 || pendingDuplicateRows.length > 0) {
    return "blocked";
  }

  if (remainingUnassignedRows.length === 0 && assignedRows.length > 0) {
    return "ready_for_import";
  }

  return "ready_for_assignment";
}

function syncImportRow(batchId: string, row: ImportBatchRow): ImportBatchRow {
  const duplicateKey = buildMandatoryDuplicateKey(row.raw, row.quantity);

  return {
    ...row,
    duplicateKey,
    idempotencyKey: makeRowIdempotencyKey(batchId, { ...row, duplicateKey }),
  };
}

function syncBatch(batch: ImportBatch): ImportBatch {
  const rows = batch.rows.map((row) => syncImportRow(batch.id, row));
  const normalizedBatch = {
    ...batch,
    rows,
    importJob: batch.importJob ?? null,
    assignmentRules: batch.assignmentRules ?? [],
    assignmentDraft: batch.assignmentDraft ?? null,
  };

  return {
    ...normalizedBatch,
    stage: computeBatchStage(normalizedBatch),
    progressPercent:
      rows.length === 0
        ? 0
        : Math.round(
            (rows.filter((row) => row.status === "assigned" || row.status === "dispatched" || row.status === "excluded").length /
              rows.length) *
              100,
          ),
    validationStatus: computeValidationStatus(normalizedBatch),
  };
}

function saveBatches(nextBatches: ImportBatch[]) {
  writeStoredBatches(nextBatches.map(syncBatch));
  void enqueueWrite(() => replaceIndexedDbBatches(readStoredBatches()));
}

async function clearPersistedImportBatches() {
  if (typeof window === "undefined") {
    return;
  }

  markImportQueueAsReset();
  cachedBatches = [];
  updateSnapshotCache();
  emitStoreChange();
  window.localStorage.removeItem(STORAGE_KEY);

  await enqueueWrite(() => replaceIndexedDbBatches([]));
}

export async function resetImportBatchStorageForDemo(options: { seedInitialOnNextLoad: boolean }) {
  if (typeof window === "undefined") {
    return;
  }

  if (options.seedInitialOnNextLoad) {
    unmarkImportQueueAsReset();
  } else {
    markImportQueueAsReset();
  }

  cachedBatches = [];
  updateSnapshotCache();
  emitStoreChange();
  window.localStorage.removeItem(STORAGE_KEY);

  await enqueueWrite(() => replaceIndexedDbBatches([]));
}

function updateBatchRows(
  batchId: string,
  updater: (rows: ImportBatchRow[]) => ImportBatchRow[],
) {
  const nextBatches = readStoredBatches().map((batch) =>
    batch.id === batchId
      ? syncBatch({
          ...batch,
          assignmentDraft: null,
          rows: updater(batch.rows),
        })
      : batch,
  );

  saveBatches(nextBatches);
}

function updateBatch(
  batchId: string,
  updater: (batch: ImportBatch) => ImportBatch,
) {
  const nextBatches = readStoredBatches().map((batch) => (batch.id === batchId ? syncBatch(updater(batch)) : batch));
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

export function getAssignmentDraft(batch: ImportBatch) {
  return buildAssignmentDraft(batch);
}

function makeImportGroupKey(batch: ImportBatch, rows: ImportBatchRow[]) {
  const firstRow = rows[0];
  const salesPointId = firstRow.match.salesPointId ?? firstRow.raw.wcode;
  const vendorId = firstRow.assignment?.vendorId ?? "";
  const rowKeys = rows.map((row) => row.idempotencyKey).sort().join(",");

  return [batch.id, firstRow.raw.poNumber, salesPointId, vendorId, rowKeys].map(normalizeKeyPart).join("::");
}

export function createOrdersFromDispatchableRows(batch: ImportBatch, dispatchableRows: ImportBatchRow[], dispatchRunId = "") {
  const groupedRows = dispatchableRows.reduce<Record<string, ImportBatchRow[]>>((accumulator, row) => {
    const salesPointId = row.match.salesPointId ?? row.raw.wcode;
    const clientId = row.match.clientId ?? getSalesPointClientBinding(salesPointId)?.clientId ?? "";
    const key = `${row.raw.poNumber}::${salesPointId}::${clientId}::${row.assignment?.vendorId}`;
    accumulator[key] = [...(accumulator[key] ?? []), row];
    return accumulator;
  }, {});

  return Object.values(groupedRows).map((rows) => {
    const firstRow = rows[0];
    const vendor = firstRow.assignment!;
    const salesPointId = firstRow.match.salesPointId ?? firstRow.raw.wcode;
    const clientBinding = firstRow.match.clientId
      ? {
          clientId: firstRow.match.clientId,
          clientName: firstRow.match.clientName,
          clientEntityName: firstRow.match.clientEntityName,
        }
      : getSalesPointClientBinding(salesPointId);
    const sourcePoNumber = firstRow.raw.poNumber;
    const topProjectName = rows.reduce<Record<string, number>>((accumulator, row) => {
      const key = row.raw.brandNamePo || row.raw.brand || "Imported Project";
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
    const campaign = Object.entries(topProjectName).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "Imported Project";
    const id = `OR-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`;
    const items = rows.map((row) => ({
      id: makeId("ITEM"),
      productCode: row.match.productCode ?? row.raw.itemCode,
      poLineNumber: row.raw.poLine,
      name: row.match.productName ?? row.raw.itemName,
      quantity: row.quantity,
      deliveredQuantity: 0,
      status: "New" as const,
      labelGenerated: false as const,
      sourceBatchId: batch.id,
      sourceRowId: row.id,
      sourcePoNumber: row.raw.poNumber,
      brandNamePo: row.raw.brandNamePo,
    }));

    return normalizeOrder({
      id,
      campaign: `Imported ${campaign}`,
      status: getOrderRequestStatus(items),
      createdDate: toIsoDate(),
      deadline: "14 days left",
      clientPO: sourcePoNumber,
      soNumber: "",
      supplier: vendor.vendorName,
      salesPointId,
      clientId: clientBinding?.clientId ?? undefined,
      clientName: clientBinding?.clientName ?? undefined,
      clientEntityName: clientBinding?.clientEntityName ?? undefined,
      picProject: {
        name: "",
        email: "",
      },
      sourceType: "bulk_po_import" as const,
      importBatchId: batch.id,
      importRowIds: rows.map((row) => row.id),
      importGroupKey: makeImportGroupKey(batch, rows),
      assignedVendorId: vendor.vendorId,
      dispatchRunId,
      importPoNumbers: [sourcePoNumber],
      items,
      labelStatus: "none" as const,
      storedLabels: [],
      storedDeliveryNotes: [],
    }) as StoredOrder;
  });
}

function dispatchAssignedRows(batchId: string): DispatchResult {
  const batch = getBatchById(batchId);

  if (!batch) {
    return {
      createdOrders: [],
      createdOrderIds: [],
      skippedExistingOrderIds: [],
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
  const candidateOrders = createOrdersFromDispatchableRows(batch, dispatchableRows, dispatchRunId);
  const existingOrders = getOrdersSnapshot();
  const existingImportedOrders = existingOrders.filter((order) =>
    candidateOrders.some((candidate) => candidate.importGroupKey && candidate.importGroupKey === order.importGroupKey),
  );
  const existingGroupKeys = new Set(existingImportedOrders.map((order) => order.importGroupKey).filter((key): key is string => Boolean(key)));
  const finalOrders = candidateOrders.filter((order) => !order.importGroupKey || !existingGroupKeys.has(order.importGroupKey));

  if (finalOrders.length > 0) {
    appendOrders(finalOrders);
  }

  const completedOrders = [...finalOrders, ...existingImportedOrders];

  const dispatchedRowIds = new Set(completedOrders.flatMap((order) => order.importRowIds ?? []));
  const skippedRowIds = [
    ...unresolvedAssignedRows.map((row) => row.id),
    ...pendingDuplicateRows.map((row) => row.id),
  ];
  const completedRowIds = [...dispatchedRowIds];
  const jobProgressPercent =
    dispatchableRows.length === 0 ? 0 : Math.round((completedRowIds.length / dispatchableRows.length) * 100);
  const nextImportJob: ImportJob = {
    id: batch.importJob?.id ?? makeId("JOB"),
    status: finalOrders.length > 0 || existingImportedOrders.length > 0 ? "imported" : "failed",
    progressPercent: finalOrders.length > 0 || existingImportedOrders.length > 0 ? Math.max(jobProgressPercent, 100) : 0,
    createdOrderIds: [...new Set([...(batch.importJob?.createdOrderIds ?? []), ...finalOrders.map((order) => order.id)])],
    completedRowIds,
    failedRowIds: skippedRowIds,
    lastError:
      finalOrders.length > 0 || existingImportedOrders.length > 0
        ? null
        : "No rows were eligible for OR creation. Resolve blockers or assign rows before retrying.",
    retryCount: batch.importJob ? batch.importJob.retryCount + 1 : 0,
    updatedAt: createdAt,
  };

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
          completedGroupKeys: completedOrders.map((order) => order.importGroupKey).filter((key): key is string => Boolean(key)),
          skippedRowIds,
          skippedExistingOrderIds: existingImportedOrders.map((order) => order.id),
        },
        ...storedBatch.dispatchRuns,
      ],
      importJob: nextImportJob,
    });
  });

  saveBatches(nextBatches);

  return {
    createdOrders: finalOrders,
    createdOrderIds: finalOrders.map((order) => order.id),
    skippedExistingOrderIds: existingImportedOrders.map((order) => order.id),
    skippedRowIds,
    unresolvedAssignedCount: unresolvedAssignedRows.length,
    pendingDuplicateCount: pendingDuplicateRows.length,
    remainingUnassignedCount,
  };
}

export function getImportBatchesSnapshot() {
  return getSnapshot();
}

export function useImportBatches() {
  return useSyncExternalStore(subscribe, getSnapshot, () => ({
    batches: initialSeedBatches,
    isHydrating: false,
  }));
}

export function useImportStore() {
  const { batches, isHydrating } = useImportBatches();

  const uploadWorkbook = async (file: File, uploadedBy = "Client Portal") => {
    await ensureImportBatchCacheHydrated();

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("Workbook has no sheets.");
    }

    const firstSheet = workbook.Sheets[firstSheetName];
    const parsedSheet = extractImportRecordsFromWorksheet(firstSheet);
    const nextBatch = buildImportBatch(file.name, firstSheetName, uploadedBy, parsedSheet.records, parsedSheet.headerRowNumber);

    await enqueueWrite(async () => {
      await putBatchIntoIndexedDb(syncBatch(nextBatch));
    });

    writeStoredBatches([nextBatch, ...readStoredBatches()]);
    return nextBatch;
  };

  const assignRowsToVendor = (batchId: string, rowIds: string[], vendorId: string) => {
    const vendor = getSupplierSnapshot().find((entry) => entry.id === vendorId);

    if (!vendor || rowIds.length === 0) {
      return;
    }

    updateBatchRows(batchId, (rows) =>
      rows.map((row) => {
        if (
          !rowIds.includes(row.id) ||
          row.status === "excluded" ||
          row.status === "dispatched" ||
          row.match.issues.length > 0 ||
          (row.possibleDuplicate && row.duplicateDecision === "pending")
        ) {
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

  const createAssignmentRule = (
    batchId: string,
    payload: {
      vendorId: string;
      conditions: ImportAssignmentRuleCondition[];
    },
  ) => {
    const vendor = getSupplierSnapshot().find((entry) => entry.id === payload.vendorId);
    const conditions = payload.conditions
      .map((condition) => ({
        field: condition.field,
        value: condition.value.trim(),
      }))
      .filter((condition) => condition.value.length > 0);

    if (!vendor || conditions.length === 0) {
      return;
    }

    updateBatch(batchId, (batch) => ({
      ...batch,
      assignmentDraft: null,
      assignmentRules: [
        ...batch.assignmentRules,
        {
          id: makeId("RUL"),
          vendorId: vendor.id,
          vendorName: vendor.name,
          conditions,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const deleteAssignmentRule = (batchId: string, ruleId: string) => {
    updateBatch(batchId, (batch) => ({
      ...batch,
      assignmentDraft: null,
      assignmentRules: batch.assignmentRules.filter((rule) => rule.id !== ruleId),
    }));
  };

  const moveAssignmentRule = (batchId: string, ruleId: string, direction: "up" | "down") => {
    updateBatch(batchId, (batch) => {
      const currentIndex = batch.assignmentRules.findIndex((rule) => rule.id === ruleId);

      if (currentIndex < 0) {
        return batch;
      }

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex < 0 || nextIndex >= batch.assignmentRules.length) {
        return batch;
      }

      const assignmentRules = [...batch.assignmentRules];
      const [rule] = assignmentRules.splice(currentIndex, 1);
      assignmentRules.splice(nextIndex, 0, rule);

      return {
        ...batch,
        assignmentDraft: null,
        assignmentRules,
      };
    });
  };

  const previewAssignmentRules = (batchId: string) => {
    updateBatch(batchId, (batch) => ({
      ...batch,
      assignmentDraft: buildAssignmentDraft(batch),
    }));
  };

  const clearAssignmentDraft = (batchId: string) => {
    updateBatch(batchId, (batch) => ({
      ...batch,
      assignmentDraft: null,
    }));
  };

  const approveAssignmentDraft = (batchId: string) => {
    const batch = getBatchById(batchId);

    if (!batch || !batch.assignmentDraft || batch.assignmentDraft.matchedRows.length === 0) {
      return 0;
    }

    const rowIdsByVendor = batch.assignmentDraft.matchedRows.reduce<Record<string, string[]>>((accumulator, match) => {
      accumulator[match.vendorId] = [...(accumulator[match.vendorId] ?? []), match.rowId];
      return accumulator;
    }, {});

    Object.entries(rowIdsByVendor).forEach(([vendorId, rowIds]) => {
      assignRowsToVendor(batchId, rowIds, vendorId);
    });

    updateBatch(batchId, (currentBatch) => ({
      ...currentBatch,
      assignmentDraft: null,
    }));

    return batch.assignmentDraft.matchedRows.length;
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

  const markDuplicateDecisionForRows = (batchId: string, rowIds: string[], decision: DuplicateDecision) => {
    if (rowIds.length === 0) {
      return;
    }

    const rowIdSet = new Set(rowIds);

    updateBatchRows(batchId, (rows) =>
      rows.map((row) =>
        rowIdSet.has(row.id)
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

  const toggleExcludedForRows = (batchId: string, rowIds: string[], excluded: boolean) => {
    if (rowIds.length === 0) {
      return;
    }

    const rowIdSet = new Set(rowIds);

    updateBatchRows(batchId, (rows) =>
      rows.map((row) => {
        if (!rowIdSet.has(row.id) || row.status === "dispatched") {
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

  const clearImportBatches = async () => {
    await ensureImportBatchCacheHydrated();
    await clearPersistedImportBatches();
  };

  return {
    batches,
    isHydrating,
    uploadWorkbook,
    createAssignmentRule,
    deleteAssignmentRule,
    moveAssignmentRule,
    previewAssignmentRules,
    clearAssignmentDraft,
    approveAssignmentDraft,
    assignRowsToVendor,
    unassignRows,
    markDuplicateDecision,
    markDuplicateDecisionForRows,
    toggleExcluded,
    toggleExcludedForRows,
    dispatchBatch,
    clearImportBatches,
  };
}

export function getImportBatchSummary(batch: ImportBatch) {
  const rows = batch.rows;
  const unresolvedRows = rows.filter((row) => row.match.issues.length > 0 && row.status !== "excluded" && row.status !== "dispatched").length;
  const pendingDuplicateRows = rows.filter(
    (row) => row.possibleDuplicate && row.duplicateDecision === "pending" && row.status !== "excluded" && row.status !== "dispatched",
  ).length;

  return {
    totalRows: rows.length,
    unresolvedRows,
    unassignedRows: rows.filter((row) => row.status === "unassigned").length,
    assignedRows: rows.filter((row) => row.status === "assigned").length,
    duplicateRows: rows.filter((row) => row.possibleDuplicate && row.status !== "excluded").length,
    pendingDuplicateRows,
    blockerRows: unresolvedRows + pendingDuplicateRows,
    excludedRows: rows.filter((row) => row.status === "excluded").length,
    dispatchedRows: rows.filter((row) => row.status === "dispatched").length,
  };
}
