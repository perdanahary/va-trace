/**
 * P1-08 — File and evidence lifecycle (CR-05).
 * Source: docs/api-contracts/shared-foundation-api.md §8.
 */

import type { ID, ISODateString, ISODateTimeString, UserRole } from "./foundation";

export type FileAssetStatus = "UPLOADING" | "AVAILABLE" | "REJECTED" | "QUARANTINED" | "DELETED";

export type FileScanStatus = "NOT_SCANNED" | "PENDING" | "CLEAN" | "FAILED";

export type FileQualityStatus =
  | "NOT_CHECKED"
  | "ACCEPTABLE"
  | "BLURRY"
  | "WRONG_DOCUMENT"
  | "INCOMPLETE";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface FileAccessPolicy {
  visibleToRoles: UserRole[];
  clientVisible: boolean;
  vendorVisible: boolean;
  expiresAt?: ISODateTimeString;
}

export interface FileAsset {
  id: ID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: "LOCAL_MOCK" | (string & {});
  storageKey: string;
  status: FileAssetStatus;
  scanStatus: FileScanStatus;
  qualityStatus?: FileQualityStatus;
  checksumSha256?: string;
  previewUrl?: string;
  downloadUrl?: string;
  capturedAt?: ISODateTimeString;
  capturedBy?: ID;
  geo?: GeoPoint;
  accessPolicy: FileAccessPolicy;
  retentionUntil?: ISODateString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  version: number;
}

export interface RegisterFileAssetDto {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  accessPolicy?: Partial<FileAccessPolicy>;
  capturedAt?: ISODateTimeString;
}
