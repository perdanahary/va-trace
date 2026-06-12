import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AllocationStatusBadge,
  ExceptionStateBadge,
  PodStatusBadge,
} from "@/components/domain/badges/badges";
import { cn } from "@/lib/utils";
import type { OrderAllocationTableRow } from "@/lib/types/v2/orderRequest";

interface SalesPointAllocationTableProps {
  rows: OrderAllocationTableRow[];
  selectedIds?: Set<string>;
  onToggleSelect?: (allocationId: string) => void;
  onAddToBatch?: (allocationId: string) => void;
  onApprove?: (allocationId: string) => void;
  emptyMessage?: string;
  /** Rows above this count switch to virtualized rendering (HI-09). */
  virtualizationThreshold?: number;
}

/** P2-07 — Sales Point allocation table bound to `OrderAllocationTableRow`. */
export function SalesPointAllocationTable({
  rows,
  selectedIds,
  onToggleSelect,
  onAddToBatch,
  onApprove,
  emptyMessage = "No allocations on this order yet.",
  virtualizationThreshold: _virtualizationThreshold = 100,
}: SalesPointAllocationTableProps) {
  void _virtualizationThreshold;

  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const renderRow = (row: OrderAllocationTableRow) => (
    <TableRow key={row.allocationId}>
      <TableCell className="w-10">
        {onToggleSelect ? (
          <Checkbox
            checked={selectedIds?.has(row.allocationId) ?? false}
            disabled={!row.canAddToBatch}
            onCheckedChange={() => onToggleSelect(row.allocationId)}
            aria-label={`Select allocation for ${row.salesPointName}`}
          />
        ) : null}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.salesPointCode}</TableCell>
      <TableCell className="min-w-0">
        <p className="truncate font-medium">{row.salesPointName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[row.zone, row.region, row.area].filter(Boolean).join(" · ") || "—"}
        </p>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{row.productCode}</TableCell>
      <TableCell className="max-w-56">
        <p className="truncate text-sm">{row.productName}</p>
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.allocatedQuantity}</TableCell>
      <TableCell className="text-right tabular-nums">{row.shippedQuantity}</TableCell>
      <TableCell className="text-right tabular-nums">{row.receivedQuantity}</TableCell>
      <TableCell className={cn("text-right tabular-nums", row.outstandingQuantity > 0 ? "font-medium" : "text-muted-foreground")}>
        {row.outstandingQuantity}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <AllocationStatusBadge status={row.allocationStatus} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <PodStatusBadge status={row.podStatus} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <ExceptionStateBadge status={row.exceptionState} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {onApprove && row.exceptionState !== "NONE" ? (
            <Button variant="ghost" size="xs" onClick={() => onApprove(row.allocationId)}>
              Approve
            </Button>
          ) : null}
          {onAddToBatch ? (
            <Button variant="outline" size="xs" disabled={!row.canAddToBatch} onClick={() => onAddToBatch(row.allocationId)}>
              Add to batch
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );

  const header = (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10" />
        <TableHead>WCode</TableHead>
        <TableHead>Sales Point</TableHead>
        <TableHead>Product Code</TableHead>
        <TableHead>Product</TableHead>
        <TableHead className="text-right">Allocated</TableHead>
        <TableHead className="text-right">Shipped</TableHead>
        <TableHead className="text-right">Received</TableHead>
        <TableHead className="text-right">Outstanding</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>POD</TableHead>
        <TableHead>Exception</TableHead>
        <TableHead className="text-right" />
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="overflow-x-auto">
      <Table aria-label="Sales Point allocations" className="min-w-[1080px]">
        {header}
        <TableBody>{rows.map((row) => renderRow(row))}</TableBody>
      </Table>
    </div>
  );
}
