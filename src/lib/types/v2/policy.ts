/**
 * P1-08 — Workflow Policy (CR-04) and SLA rules (MED-04).
 * Source: docs/api-contracts/shared-foundation-api.md §7.
 */

import type { ID, ISODateString, ISODateTimeString } from "./foundation";
import type { ShippingLabelType } from "./status";

export type WorkflowPolicyScope = "GLOBAL" | "CLIENT" | "PROJECT" | "VENDOR" | "CLIENT_VENDOR";

export interface OrderPolicyRules {
  clientPoRequired: boolean;
  allowUnderAllocationOnSubmit: boolean;
  requireUnderAllocationApproval: boolean;
  allowOrderAmendmentAfterShipment: boolean;
}

export interface ShipmentPolicyRules {
  enforceProductionReadyQuantity: boolean;
  requireDeliveryNoteBeforeDispatch: boolean;
  requireLabelsBeforeDispatch: boolean;
  allowOverShipment: boolean;
  maxOverShipmentPercent?: number;
  blockDispatchForMissingAddress: boolean;
  blockDispatchForMissingContact: boolean;
}

export interface PodPolicyRules {
  podRequired: boolean;
  signedDeliveryNoteRequired: boolean;
  photoEvidenceRequired: boolean;
  minPhotoCount?: number;
  allowOverReceipt: boolean;
  requireAdminOverageApproval: boolean;
  missingPodEscalationHours: number;
}

export interface DocumentPolicyRules {
  oneActiveDeliveryNotePerBatch: boolean;
  allowVendorRegenerateDeliveryNote: boolean;
  requireAdminReasonForVoid: boolean;
  labelType: ShippingLabelType;
}

export interface ExposurePolicyRules {
  clientCanViewPodEvidence: boolean;
  clientCanViewDeliveryNotes: boolean;
  clientCanViewVendorName: boolean;
  analystCanExportEvidenceMetadata: boolean;
}

export interface SlaPolicyRules {
  productionDueHours?: number;
  dispatchDueHours?: number;
  podDueHours?: number;
  exceptionResolutionDueHours?: number;
}

export interface WorkflowPolicy {
  id: ID;
  name: string;
  scope: WorkflowPolicyScope;
  clientId?: ID;
  projectId?: ID;
  vendorId?: ID;
  effectiveFrom: ISODateString;
  effectiveTo?: ISODateString;
  orderRules: OrderPolicyRules;
  shipmentRules: ShipmentPolicyRules;
  podRules: PodPolicyRules;
  documentRules: DocumentPolicyRules;
  exposureRules: ExposurePolicyRules;
  slaRules: SlaPolicyRules;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  version: number;
}
