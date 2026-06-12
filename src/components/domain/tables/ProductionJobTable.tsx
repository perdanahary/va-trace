import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import type { ProductionJobListRow } from "@/lib/types/v2/production";

interface ProductionJobTableProps {
  rows: ProductionJobListRow[];
  onUpdate?: (productionJobId: string) => void;
  updateLabel?: string;
  emptyMessage?: string;
  detailPathPrefix?: string;
}

/** P2-19 data surface — production queue bound to `ProductionJobListRow`. */
export function ProductionJobTable({
  rows,
  onUpdate,
  updateLabel = "Update",
  emptyMessage = "No production jobs in the queue.",
  detailPathPrefix = "/admin/production",
}: ProductionJobTableProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Ordered</TableHead>
            <TableHead className="text-right">Produced</TableHead>
            <TableHead className="text-right">QC Passed</TableHead>
            <TableHead className="text-right">Ready</TableHead>
            <TableHead className="text-right">Reserved</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-xs">
                <Link to={`${detailPathPrefix}/${row.id}`} className="font-medium text-link hover:underline">
                  {row.jobNumber}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.orderRequest.name}</TableCell>
              <TableCell className="max-w-64">
                <p className="truncate text-sm">{row.orderItem.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{row.orderItem.code}</p>
              </TableCell>
              <TableCell className="text-sm">{row.vendor.name}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.orderedQuantity}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.producedQuantity}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.qcPassedQuantity}</TableCell>
              <TableCell className="text-right text-sm font-medium tabular-nums">{row.readyQuantity}</TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {row.reservedForShipmentQuantity}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.completedQuantity}</TableCell>
              <TableCell className="whitespace-nowrap">
                <ProductionStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.deadline ?? "—"}</TableCell>
              <TableCell className="text-right">
                {onUpdate ? (
                  <Button variant="outline" size="sm" onClick={() => onUpdate(row.id)}>
                    {updateLabel}
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
