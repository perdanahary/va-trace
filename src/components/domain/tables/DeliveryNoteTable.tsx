import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeliveryNoteStatusBadge, PodStatusBadge } from "@/components/domain/badges/badges";
import type { DeliveryNoteListRow } from "@/lib/types/v2/deliveryNote";

interface DeliveryNoteTableProps {
  rows: DeliveryNoteListRow[];
  emptyMessage?: string;
}

/** P2-09 — Delivery Notes register bound to `DeliveryNoteListRow`. */
export function DeliveryNoteTable({ rows, emptyMessage = "No delivery notes found." }: DeliveryNoteTableProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>DN Number</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Client PO</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Sales Points</TableHead>
            <TableHead className="text-right">Shipped Qty</TableHead>
            <TableHead>Generated</TableHead>
            <TableHead>Printed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Proof of Delivery (POD)</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={!row.isActive ? "opacity-60" : undefined}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-xs font-medium">{row.deliveryNoteNumber}</span>
                  {row.documentVersion > 1 ? (
                    <span className="text-xs text-muted-foreground">v{row.documentVersion}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Link to={row.actionTargets.batchDetailPath} className="font-mono text-xs text-link hover:underline">
                  {row.batchNumber}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-xs">{row.orderRequestNumber}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{row.clientPoNumber ?? "—"}</TableCell>
              <TableCell className="text-sm">{row.vendorName}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.salesPointCount}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.shippedQuantity}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.generatedAt.slice(0, 10)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.printedAt ? row.printedAt.slice(0, 10) : "—"}</TableCell>
              <TableCell className="whitespace-nowrap">
                <DeliveryNoteStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <PodStatusBadge status={row.podStatus} />
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link to={row.actionTargets.printPath}>Print</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
