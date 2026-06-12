import { Filter } from "lucide-react";
import type { ReactNode } from "react";

import { FilterField, FilterSection } from "@/components/shared/FilterSection";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DELIVERY_CONFIRMATION_STATUSES,
  DELIVERY_NOTE_STATUSES,
  DISTRIBUTION_STATUSES,
  PRODUCTION_STATUSES,
  SHIPMENT_BATCH_STATUSES,
} from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";

interface StatusFilterProps<T extends string> {
  value: string;
  onValueChange: (value: string) => void;
  statuses: readonly T[];
  label: string;
  allLabel: string;
}

function StatusFilter<T extends string>({ value, onValueChange, statuses, label, allLabel }: StatusFilterProps<T>) {
  return (
    <FilterField label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <Filter className="h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {formatStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

export function ProductionStatusFilter({ value, onValueChange }: Pick<StatusFilterProps<string>, "value" | "onValueChange">) {
  return <StatusFilter value={value} onValueChange={onValueChange} statuses={PRODUCTION_STATUSES} label="Production" allLabel="All production" />;
}

export function DistributionStatusFilter({ value, onValueChange }: Pick<StatusFilterProps<string>, "value" | "onValueChange">) {
  return <StatusFilter value={value} onValueChange={onValueChange} statuses={DISTRIBUTION_STATUSES} label="Distribution" allLabel="All distribution" />;
}

export function ShipmentBatchStatusFilter({ value, onValueChange }: Pick<StatusFilterProps<string>, "value" | "onValueChange">) {
  return <StatusFilter value={value} onValueChange={onValueChange} statuses={SHIPMENT_BATCH_STATUSES} label="Batch" allLabel="All batches" />;
}

export function DeliveryNoteStatusFilter({ value, onValueChange }: Pick<StatusFilterProps<string>, "value" | "onValueChange">) {
  return <StatusFilter value={value} onValueChange={onValueChange} statuses={DELIVERY_NOTE_STATUSES} label="Delivery Note" allLabel="All delivery notes" />;
}

export function PodStatusFilter({ value, onValueChange }: Pick<StatusFilterProps<string>, "value" | "onValueChange">) {
  return <StatusFilter value={value} onValueChange={onValueChange} statuses={DELIVERY_CONFIRMATION_STATUSES} label="POD" allLabel="All POD" />;
}

export function LogisticsFilterSection({ children }: { children: ReactNode }) {
  return <FilterSection contentClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">{children}</FilterSection>;
}
