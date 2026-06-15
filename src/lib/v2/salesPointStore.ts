/**
 * P1-12 — Sales Point master data store.
 * Storage key: `va-trace-v2-salespoints`.
 *
 * Owns `SalesPoint` and `SalesPointContact` (allocations live in
 * `allocationStore`). Seeded from the legacy mapping via the seed builders.
 * Master-data changes never rewrite historical document snapshots (MED-02).
 */

import type { CommandMetadata, ID, MutationResponse, SalesPointReference } from "@/lib/types/v2/foundation";
import type {
  CreateSalesPointContactDto,
  CreateSalesPointDto,
  SalesPoint,
  SalesPointContact,
  UpdateSalesPointDto,
} from "@/lib/types/v2/salesPoint";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  assertVersion,
  createCollectionStore,
  notFoundError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";
import { deriveSalesPointDataQuality } from "@/lib/v2/selectors/salesPointQuality";

const store = createCollectionStore<SalesPoint>({
  storageKey: "va-trace-v2-salespoints",
  entityType: "SALES_POINT",
  seed: () => buildV2SeedData().salesPoints,
  migrate: (persisted) => {
    if (!Array.isArray(persisted) || persisted.length === 0) {
      return buildV2SeedData().salesPoints;
    }
    return (persisted as SalesPoint[]).map((salesPoint) => ({
      ...salesPoint,
      dataQuality: deriveSalesPointDataQuality(salesPoint),
    }));
  },
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function useSalesPoints(): SalesPoint[] {
  return store.useAll();
}

export function getSalesPoints(): SalesPoint[] {
  return store.getAll();
}

/** Resolves by internal ID or WCode (legacy orders reference WCodes). */
export function getSalesPointById(salesPointId: ID): SalesPoint | undefined {
  const salesPoints = store.getAll();
  return (
    salesPoints.find((entry) => entry.id === salesPointId) ??
    salesPoints.find((entry) => entry.wCode === salesPointId)
  );
}

export function toSalesPointReference(salesPoint: SalesPoint): SalesPointReference {
  return {
    id: salesPoint.id,
    code: salesPoint.code,
    wCode: salesPoint.wCode,
    name: salesPoint.name,
    zone: salesPoint.geography.zone,
    region: salesPoint.geography.region,
    area: salesPoint.geography.area,
    subArea: salesPoint.geography.subArea,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function buildContact(salesPointId: ID, dto: CreateSalesPointContactDto, isFirst: boolean, actorUserId: ID): SalesPointContact {
  const now = nowIso();
  return {
    id: newId("spc"),
    salesPointId,
    name: dto.name,
    role: dto.role,
    phone: dto.phone,
    email: dto.email,
    isPrimary: dto.isPrimary ?? isFirst,
    isActive: true,
    notes: dto.notes,
    audit: { createdAt: now, createdBy: actorUserId, updatedAt: now, updatedBy: actorUserId },
  };
}

export function createSalesPoint(dto: CreateSalesPointDto, command: CommandMetadata): MutationResponse<SalesPoint> {
  return runCommand({
    command,
    execute: (context) => {
      const existing = store.getAll();
      if (existing.some((entry) => entry.wCode === dto.wCode)) {
        throw validationError(`Sales Point WCode "${dto.wCode}" already exists.`, [
          { field: "wCode", code: "DUPLICATE", message: "WCode must be unique." },
        ]);
      }
      if (existing.some((entry) => entry.code === dto.code)) {
        throw validationError(`Sales Point code "${dto.code}" already exists.`, [
          { field: "code", code: "DUPLICATE", message: "Code must be unique." },
        ]);
      }

      const now = nowIso();
      const id = dto.wCode;
      const base: Omit<SalesPoint, "dataQuality"> = {
        id,
        code: dto.code,
        wCode: dto.wCode,
        name: dto.name,
        clientId: dto.clientId,
        clientName: "",
        companyName: dto.companyName ?? "",
        status: dto.status ?? "DRAFT",
        entityType: dto.entityType,
        geography: dto.geography,
        address: dto.address,
        deliveryInstructions: dto.deliveryInstructions,
        contacts: (dto.contacts ?? []).map((contact, index) => buildContact(id, contact, index === 0, command.actorUserId)),
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      };
      const salesPoint: SalesPoint = { ...base, dataQuality: deriveSalesPointDataQuality(base) };

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "SALES_POINT",
        sourceEntityId: salesPoint.id,
        newValue: { code: salesPoint.code, wCode: salesPoint.wCode, name: salesPoint.name },
      });

      store.upsert(salesPoint);
      return salesPoint;
    },
  });
}

export function updateSalesPoint(
  salesPointId: ID,
  dto: UpdateSalesPointDto,
  command: CommandMetadata,
): MutationResponse<SalesPoint> {
  return runCommand({
    command,
    execute: (context) => {
      const salesPoint = store.getById(salesPointId) ?? getSalesPointById(salesPointId);
      if (!salesPoint) throw notFoundError("SALES_POINT", salesPointId);
      assertVersion(salesPoint, dto.expectedVersion, "SALES_POINT");

      const next: SalesPoint = {
        ...salesPoint,
        code: dto.code ?? salesPoint.code,
        wCode: dto.wCode ?? salesPoint.wCode,
        name: dto.name ?? salesPoint.name,
        clientId: dto.clientId ?? salesPoint.clientId,
        companyName: dto.companyName ?? salesPoint.companyName,
        status: dto.status ?? salesPoint.status,
        entityType: dto.entityType === null ? undefined : dto.entityType ?? salesPoint.entityType,
        geography: { ...salesPoint.geography, ...dto.geography },
        address: { ...salesPoint.address, ...dto.address },
        deliveryInstructions:
          dto.deliveryInstructions === null ? undefined : dto.deliveryInstructions ?? salesPoint.deliveryInstructions,
        audit: { ...salesPoint.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: salesPoint.version + 1,
      };
      const hydrated = { ...next, dataQuality: deriveSalesPointDataQuality(next) };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SALES_POINT",
        sourceEntityId: salesPoint.id,
        previousValue: { name: salesPoint.name, status: salesPoint.status },
        newValue: { name: hydrated.name, status: hydrated.status },
      });

      store.upsert(hydrated);
      return hydrated;
    },
  });
}

export function addSalesPointContact(
  salesPointId: ID,
  dto: CreateSalesPointContactDto,
  command: CommandMetadata,
): MutationResponse<SalesPoint> {
  return runCommand({
    command,
    execute: (context) => {
      const salesPoint = getSalesPointById(salesPointId);
      if (!salesPoint) throw notFoundError("SALES_POINT", salesPointId);
      if (!dto.name) throw validationError("Contact name is required.");

      const contact = buildContact(salesPoint.id, dto, salesPoint.contacts.length === 0, command.actorUserId);
      const contacts = dto.isPrimary
        ? [...salesPoint.contacts.map((existing) => ({ ...existing, isPrimary: false })), contact]
        : [...salesPoint.contacts, contact];

      const next: SalesPoint = {
        ...salesPoint,
        contacts,
        audit: { ...salesPoint.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: salesPoint.version + 1,
      };
      const hydrated = { ...next, dataQuality: deriveSalesPointDataQuality(next) };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SALES_POINT",
        sourceEntityId: salesPoint.id,
        newValue: { contactAdded: contact.name, role: contact.role },
      });

      store.upsert(hydrated);
      return hydrated;
    },
  });
}

export function updateSalesPointContact(
  salesPointId: ID,
  contactId: ID,
  dto: Partial<Pick<SalesPointContact, "name" | "role" | "phone" | "email" | "isPrimary" | "notes">>,
  command: CommandMetadata,
): MutationResponse<SalesPoint> {
  return runCommand({
    command,
    execute: (context) => {
      const salesPoint = getSalesPointById(salesPointId);
      if (!salesPoint) throw notFoundError("SALES_POINT", salesPointId);

      let contacts = salesPoint.contacts.map((c) => {
        if (c.id !== contactId) return c;
        return {
          ...c,
          name: dto.name ?? c.name,
          role: dto.role ?? c.role,
          phone: dto.phone === null ? undefined : dto.phone ?? c.phone,
          email: dto.email === null ? undefined : dto.email ?? c.email,
          isPrimary: dto.isPrimary ?? c.isPrimary,
          notes: dto.notes === null ? undefined : dto.notes ?? c.notes,
          audit: { ...c.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        };
      });

      if (dto.isPrimary) {
        contacts = contacts.map((c) => (c.id === contactId ? c : { ...c, isPrimary: false }));
      }

      const next: SalesPoint = {
        ...salesPoint,
        contacts,
        audit: { ...salesPoint.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: salesPoint.version + 1,
      };
      const hydrated = { ...next, dataQuality: deriveSalesPointDataQuality(next) };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SALES_POINT",
        sourceEntityId: salesPoint.id,
        newValue: { contactUpdated: contactId },
      });

      store.upsert(hydrated);
      return hydrated;
    },
  });
}

export function removeSalesPointContact(
  salesPointId: ID,
  contactId: ID,
  command: CommandMetadata,
): MutationResponse<SalesPoint> {
  return runCommand({
    command,
    execute: (context) => {
      const salesPoint = getSalesPointById(salesPointId);
      if (!salesPoint) throw notFoundError("SALES_POINT", salesPointId);

      const contact = salesPoint.contacts.find((c) => c.id === contactId);
      const contacts = salesPoint.contacts.filter((c) => c.id !== contactId);

      const next: SalesPoint = {
        ...salesPoint,
        contacts,
        audit: { ...salesPoint.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: salesPoint.version + 1,
      };
      const hydrated = { ...next, dataQuality: deriveSalesPointDataQuality(next) };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "SALES_POINT",
        sourceEntityId: salesPoint.id,
        newValue: { contactRemoved: contact?.name ?? contactId },
      });

      store.upsert(hydrated);
      return hydrated;
    },
  });
}
