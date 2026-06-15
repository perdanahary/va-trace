import { Link } from "react-router-dom";
import { MoreHorizontal, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DeliveryNoteStatusBadge,
  PodStatusBadge,
  ShipmentBatchStatusBadge,
} from "@/components/domain/badges/badges";
import type { ShipmentBatchListRow } from "@/lib/types/v2/shipment";

interface ShipmentBatchTableProps {
  rows: ShipmentBatchListRow[];
  emptyMessage?: string;
}

/** P2-08 — Shipment Batch list bound to `ShipmentBatchListRow`. */
export function ShipmentBatchTable({ rows, emptyMessage = "No shipment batches found." }: ShipmentBatchTableProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Client PO</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Sales Points</TableHead>
            <TableHead className="text-right">Shipped</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead>Dispatched</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>DN</TableHead>
            <TableHead>Proof of Delivery (POD)</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link to={row.actionTargets.detailPath} className="flex items-center gap-2 text-link hover:underline">
                  <Truck className="h-3.5 w-3.5" />
                  <span className="font-mono text-xs font-medium">{row.batchNumber}</span>
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.orderRequestNumber}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.clientPoNumber ?? "—"}</TableCell>
              <TableCell className="text-sm">{row.vendorName}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.salesPointCount}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.shippedQuantity}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {row.receivedQuantity}
                {row.varianceQuantity !== 0 ? (
                  <span className="ml-1 text-xs text-destructive">({row.varianceQuantity > 0 ? "+" : ""}{row.varianceQuantity})</span>
                ) : null}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.dispatchedAt ? row.dispatchedAt.slice(0, 10) : "—"}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <ShipmentBatchStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {row.deliveryNoteStatus ? <DeliveryNoteStatusBadge status={row.deliveryNoteStatus} /> : <span className="text-xs text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <PodStatusBadge status={row.podStatus} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.batchNumber}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={row.actionTargets.detailPath}>Open batch</Link>
                    </DropdownMenuItem>
                    {row.actionTargets.deliveryNotePrintPath ? (
                      <DropdownMenuItem asChild>
                        <Link to={row.actionTargets.deliveryNotePrintPath}>Print delivery note</Link>
                      </DropdownMenuItem>
                    ) : null}
                    {row.actionTargets.labelsPrintPath ? (
                      <DropdownMenuItem asChild>
                        <Link to={row.actionTargets.labelsPrintPath}>Print labels</Link>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
