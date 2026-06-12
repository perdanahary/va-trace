import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeliveryConfirmationStatusBadge } from "@/components/domain/badges/badges";
import { cn } from "@/lib/utils";
import type { PodVerificationQueueRow } from "@/lib/types/v2/deliveryNote";

interface PodQueueTableProps {
  rows: PodVerificationQueueRow[];
  onOpen?: (deliveryConfirmationId: string) => void;
  openLabel?: string;
  emptyMessage?: string;
}

/** P2-10 — POD verification queue bound to `PodVerificationQueueRow`. */
export function PodQueueTable({
  rows,
  onOpen,
  openLabel = "Review",
  emptyMessage = "No POD submissions in the queue.",
}: PodQueueTableProps) {
  if (rows.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>POD</TableHead>
            <TableHead>DN Number</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Sales Point</TableHead>
            <TableHead>Receiver</TableHead>
            <TableHead>Received</TableHead>
            <TableHead className="text-right">Age (h)</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Claimed</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">Evidence</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.deliveryConfirmationId}>
              <TableCell className="font-mono text-xs">{row.deliveryConfirmationId.slice(0, 12)}</TableCell>
              <TableCell className="font-mono text-xs">{row.deliveryNoteNumber || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{row.orderRequestNumber}</TableCell>
              <TableCell className="text-sm">{row.salesPointName}</TableCell>
              <TableCell className="text-sm">{row.receiverName || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.receivedDate}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.ageHours}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.expectedShippedQuantity}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.claimedReceivedQuantity}</TableCell>
              <TableCell
                className={cn(
                  "text-right text-sm tabular-nums",
                  row.varianceQuantity !== 0 ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {row.varianceQuantity > 0 ? `+${row.varianceQuantity}` : row.varianceQuantity}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{row.evidenceCount}</TableCell>
              <TableCell className="whitespace-nowrap">
                <DeliveryConfirmationStatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-right">
                {onOpen ? (
                  <Button variant="outline" size="sm" onClick={() => onOpen(row.deliveryConfirmationId)}>
                    {openLabel}
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
