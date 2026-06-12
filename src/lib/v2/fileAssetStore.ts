/**
 * P1-16 — File asset store (CR-05).
 * Storage key: `va-trace-v2-files`.
 *
 * Every evidence/generated document file becomes a `FileAsset` with type/size
 * validation and an access policy before it can be linked to POD or DN records.
 */

import type { CommandMetadata, ID, MutationResponse } from "@/lib/types/v2/foundation";
import type { FileAsset, RegisterFileAssetDto } from "@/lib/types/v2/fileAsset";
import { newId, nowIso } from "@/lib/v2/ids";
import { createCollectionStore, runCommand, validationError } from "@/lib/v2/repository";

const store = createCollectionStore<FileAsset>({
  storageKey: "va-trace-v2-files",
  entityType: "FILE_ASSET",
});

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export function useFileAssets(): FileAsset[] {
  return store.useAll();
}

export function getFileAssetById(id: ID): FileAsset | undefined {
  return store.getById(id);
}

export function registerFileAsset(
  dto: RegisterFileAssetDto,
  command: CommandMetadata,
): MutationResponse<FileAsset> {
  return runCommand({
    command,
    execute: (context) => {
      if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
        throw validationError(`File type ${dto.mimeType} is not allowed.`, [
          { field: "mimeType", code: "FILE_REJECTED", message: `Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}` },
        ]);
      }
      if (dto.sizeBytes > MAX_FILE_SIZE_BYTES) {
        throw validationError(`File exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit.`, [
          { field: "sizeBytes", code: "FILE_REJECTED", message: "File too large." },
        ]);
      }

      const now = nowIso();
      const asset: FileAsset = {
        id: newId("file"),
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageProvider: "LOCAL_MOCK",
        storageKey: dto.storageKey,
        status: "AVAILABLE",
        scanStatus: "NOT_SCANNED",
        qualityStatus: "NOT_CHECKED",
        capturedAt: dto.capturedAt,
        accessPolicy: {
          visibleToRoles: dto.accessPolicy?.visibleToRoles ?? ["ADMIN", "OPERATOR", "ANALYST", "VENDOR"],
          clientVisible: dto.accessPolicy?.clientVisible ?? false,
          vendorVisible: dto.accessPolicy?.vendorVisible ?? true,
        },
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      context.audit({
        eventType: "FILE_UPLOADED",
        sourceEntityType: "FILE_ASSET",
        sourceEntityId: asset.id,
        newValue: { fileName: asset.fileName, sizeBytes: asset.sizeBytes },
      });
      context.sideEffect({
        type: "FILE_LINKED",
        entityType: "FILE_ASSET",
        entityId: asset.id,
        description: `Registered file ${asset.fileName}`,
      });

      store.upsert(asset);
      return asset;
    },
  });
}
