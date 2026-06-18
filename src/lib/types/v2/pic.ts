/** PIC (Person-In-Charge) master data type and DTOs. */

import type { AuditStamp, ID } from "./foundation";

export interface Pic {
  id: ID;
  code: string;
  name: string;
  email: string;
  audit: AuditStamp;
  version: number;
}

export interface CreatePicDto {
  code: string;
  name: string;
  email: string;
}

export interface UpdatePicDto {
  code?: string;
  name?: string;
  email?: string;
  expectedVersion: number;
}
