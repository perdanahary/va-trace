/**
 * P2-05 — V2 status badge family.
 *
 * Family-specific badges over the shadcn `Badge` primitive using only the
 * documented status tokens (success/processing/warning/destructive/secondary).
 * Every enum member of each status family has an explicit variant.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  AllocationStatus,
  DeliveryConfirmationStatus,
  DeliveryNoteStatus,
  DistributionStatus,
  ExceptionState,
  PodStatus,
  ProductionStatus,
  ShipmentBatchStatus,
} from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";

type BadgeVariant = "success" | "processing" | "warning" | "destructive" | "secondary";

interface DomainBadgeProps {
  className?: string;
}

function DomainBadge({ label, variant, className }: { label: string; variant: BadgeVariant } & DomainBadgeProps) {
  return (
    <Badge variant={variant} className={cn("rounded-full uppercase tracking-[0.18em]", className)}>
      {label}
    </Badge>
  );
}

const productionVariants: Record<ProductionStatus, BadgeVariant> = {
  NEW: "secondary",
  SUBMITTED: "processing",
  ACCEPTED: "processing",
  PRINTING: "processing",
  FINISHING: "processing",
  QUALITY_CONTROL: "processing",
  READY_FOR_DISTRIBUTION: "processing",
  COMPLETED: "success",
  CANCELLED: "destructive",
  EXCEPTION: "destructive",
};

export function ProductionStatusBadge({ status, className }: { status: ProductionStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={productionVariants[status]} className={className} />;
}

const distributionVariants: Record<DistributionStatus, BadgeVariant> = {
  NOT_STARTED: "secondary",
  PARTIALLY_DISTRIBUTED: "processing",
  FULLY_DISTRIBUTED: "processing",
  PARTIALLY_RECEIVED: "warning",
  FULLY_RECEIVED: "success",
  CANCELLED: "destructive",
  EXCEPTION: "destructive",
};

export function DistributionStatusBadge({ status, className }: { status: DistributionStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={distributionVariants[status]} className={className} />;
}

const allocationVariants: Record<AllocationStatus, BadgeVariant> = {
  NOT_SHIPPED: "secondary",
  PARTIALLY_SHIPPED: "processing",
  FULLY_SHIPPED: "processing",
  PARTIALLY_RECEIVED: "warning",
  FULLY_RECEIVED: "success",
  SHORT_RECEIVED: "destructive",
  OVER_RECEIVED: "warning",
  ADJUSTED: "warning",
  CANCELLED: "destructive",
  EXCEPTION: "destructive",
};

export function AllocationStatusBadge({ status, className }: { status: AllocationStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={allocationVariants[status]} className={className} />;
}

const batchVariants: Record<ShipmentBatchStatus, BadgeVariant> = {
  DRAFT: "secondary",
  READY: "processing",
  DISPATCHED: "processing",
  IN_TRANSIT: "processing",
  PARTIALLY_RECEIVED: "warning",
  FULLY_RECEIVED: "success",
  FAILED_DELIVERY: "destructive",
  RETURNED: "destructive",
  EXCEPTION: "destructive",
  CLOSED: "success",
  CANCELLED: "destructive",
  VOIDED: "destructive",
};

export function ShipmentBatchStatusBadge({ status, className }: { status: ShipmentBatchStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={batchVariants[status]} className={className} />;
}

const deliveryNoteVariants: Record<DeliveryNoteStatus, BadgeVariant> = {
  GENERATED: "secondary",
  PRINTED: "processing",
  SIGNED: "processing",
  UPLOADED: "processing",
  VERIFIED: "success",
  CLOSED: "success",
  SUPERSEDED: "secondary",
  REGENERATED: "warning",
  VOIDED: "destructive",
};

export function DeliveryNoteStatusBadge({ status, className }: { status: DeliveryNoteStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={deliveryNoteVariants[status]} className={className} />;
}

const podVariants: Record<PodStatus, BadgeVariant> = {
  NOT_REQUIRED: "secondary",
  NOT_STARTED: "secondary",
  DRAFT: "secondary",
  PENDING_UPLOAD: "warning",
  SUBMITTED: "processing",
  PARTIALLY_VERIFIED: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
  CORRECTION_REQUESTED: "warning",
  VARIANCE: "destructive",
  MISSING: "destructive",
};

export function PodStatusBadge({ status, className }: { status: PodStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={podVariants[status]} className={className} />;
}

const confirmationVariants: Record<DeliveryConfirmationStatus, BadgeVariant> = {
  DRAFT: "secondary",
  SUBMITTED: "processing",
  PENDING_VERIFICATION: "processing",
  PARTIALLY_VERIFIED: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
  CORRECTION_REQUESTED: "warning",
  RESUBMITTED: "processing",
  WITHDRAWN: "secondary",
  SUPERSEDED: "secondary",
  CLOSED: "success",
};

export function DeliveryConfirmationStatusBadge({
  status,
  className,
}: { status: DeliveryConfirmationStatus } & DomainBadgeProps) {
  return <DomainBadge label={formatStatusLabel(status)} variant={confirmationVariants[status]} className={className} />;
}

const exceptionStateVariants: Record<ExceptionState, BadgeVariant> = {
  NONE: "secondary",
  WARNING: "warning",
  BLOCKED: "destructive",
  RESOLVED: "success",
};

export function ExceptionStateBadge({ status, className }: { status: ExceptionState } & DomainBadgeProps) {
  if (status === "NONE") {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }
  return <DomainBadge label={formatStatusLabel(status)} variant={exceptionStateVariants[status]} className={className} />;
}
