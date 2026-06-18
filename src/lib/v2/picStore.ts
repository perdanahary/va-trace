/**
 * P1 — PIC (Person-In-Charge) master data store.
 * Storage key: `va-trace-v2-pics`.
 *
 * Owns Pic master data records. Seeded from V2 order requests that carry
 * project PIC name/email on their ProjectReference.
 */

import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import type { CreatePicDto, Pic, UpdatePicDto } from "@/lib/types/v2/pic";
import { newId, nowIso } from "@/lib/v2/ids";
import {
  createCollectionStore,
  notFoundError,
  runCommand,
  validationError,
} from "@/lib/v2/repository";
import { buildV2SeedData } from "@/lib/v2/seed/seedBuilders";

const store = createCollectionStore<Pic>({
  storageKey: "va-trace-v2-pics",
  entityType: "PIC",
  seed: () => buildV2SeedData().pics,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function usePics(): Pic[] {
  return store.useAll();
}

export function getPics(): Pic[] {
  return store.getAll();
}

export function getPicById(id: ID): Pic | undefined {
  return store.getById(id);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function createPic(
  dto: CreatePicDto,
  command: CommandMetadata,
): MutationResponse<Pic> {
  return runCommand({
    command,
    execute: (context) => {
      const code = dto.code.trim().toUpperCase();
      if (!code) {
        throw validationError("PIC code is required.", [
          { field: "code", code: "REQUIRED", message: "Code is required." },
        ]);
      }
      if (!/^[A-Z0-9]{1,10}$/.test(code)) {
        throw validationError("PIC code must be alphanumeric, max 10 characters.", [
          { field: "code", code: "INVALID_FORMAT", message: "Alphanumeric, max 10 chars." },
        ]);
      }
      if (!dto.name.trim()) {
        throw validationError("PIC name is required.", [
          { field: "name", code: "REQUIRED", message: "Name is required." },
        ]);
      }

      const existing = store.getAll();
      if (existing.some((pic) => pic.code.toUpperCase() === code)) {
        throw validationError(`PIC code "${code}" already exists.`, [
          { field: "code", code: "DUPLICATE", message: "Code must be unique." },
        ]);
      }

      const now = nowIso();
      const pic: Pic = {
        id: newId("pic"),
        code,
        name: dto.name.trim(),
        email: dto.email.trim(),
        audit: { createdAt: now, createdBy: command.actorUserId, updatedAt: now, updatedBy: command.actorUserId },
        version: 1,
      };

      context.audit({
        eventType: "CREATED",
        sourceEntityType: "PIC",
        sourceEntityId: pic.id,
        newValue: { code: pic.code, name: pic.name, email: pic.email },
      });

      store.upsert(pic);
      return pic;
    },
  });
}

export function updatePic(
  picId: ID,
  dto: UpdatePicDto,
  command: CommandMetadata,
): MutationResponse<Pic> {
  return runCommand({
    command,
    execute: (context) => {
      const pic = store.getById(picId);
      if (!pic) throw notFoundError("PIC", picId);

      const code = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;
      if (code !== undefined) {
        if (!code) {
          throw validationError("PIC code is required.", [
            { field: "code", code: "REQUIRED", message: "Code is required." },
          ]);
        }
        if (!/^[A-Z0-9]{1,10}$/.test(code)) {
          throw validationError("PIC code must be alphanumeric, max 10 characters.", [
            { field: "code", code: "INVALID_FORMAT", message: "Alphanumeric, max 10 chars." },
          ]);
        }
        const duplicate = store.getAll().find((p) => p.id !== picId && p.code.toUpperCase() === code);
        if (duplicate) {
          throw validationError(`PIC code "${code}" already exists.`, [
            { field: "code", code: "DUPLICATE", message: "Code must be unique." },
          ]);
        }
      }

      const next: Pic = {
        ...pic,
        code: code ?? pic.code,
        name: dto.name !== undefined ? dto.name.trim() || pic.name : pic.name,
        email: dto.email !== undefined ? dto.email.trim() : pic.email,
        audit: { ...pic.audit, updatedAt: nowIso(), updatedBy: command.actorUserId },
        version: pic.version + 1,
      };

      context.audit({
        eventType: "UPDATED",
        sourceEntityType: "PIC",
        sourceEntityId: pic.id,
        previousValue: { code: pic.code, name: pic.name, email: pic.email },
        newValue: { code: next.code, name: next.name, email: next.email },
      });

      store.upsert(next);
      return next;
    },
  });
}

export function deletePic(
  picId: ID,
  _command: CommandMetadata,
): { deleted: boolean } {
  const pic = store.getById(picId);
  if (!pic) throw notFoundError("PIC", picId);

  const all = store.getAll();
  store.replaceAll(all.filter((p) => p.id !== picId));

  return { deleted: true };
}
