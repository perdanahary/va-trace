import { ArrowDown, ArrowUp, AlertTriangle, ChevronsUpDown, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductionStatusBadge, DistributionStatusBadge } from "@/components/domain/badges/badges";
import { cn } from "@/lib/utils";
import { formatDate, formatDeadlineInfo } from "@/lib/format";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { acceptProductionJob, getProductionJobsForOrder } from "@/lib/v2/productionStore";
import { acceptOrderRequest } from "@/lib/v2/orderRequestStore";

export type SortColumn = "created" | "deadline" | "orderRequest";
export type SortDirection = "asc" | "desc";

export type VendorTab = "Pending" | "Production" | "Shipping" | "History";

interface VendorOrderTableProps {
  orders: OrderListRow[];
  tab: VendorTab;
  sort: { column: SortColumn; direction: SortDirection };
  onSortChange: (column: SortColumn) => void;
}

export function VendorOrderTable({ orders, tab, sort, onSortChange }: VendorOrderTableProps) {
  const navigate = useNavigate();
  const actor = useActor("vendor", "vendor-order-table");

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const jobs = getProductionJobsForOrder(orderId);
      if (jobs.length > 0) {
        try {
          acceptProductionJob(
            { productionJobId: jobs[0].id, expectedVersion: jobs[0].version, acceptedByUserId: actor.userId },
            buildCommand(actor, "Start production from vendor dashboard"),
          );
        } catch {
          // Job accept may fail due to vendor scope; order accept still proceeds.
        }
      }
      acceptOrderRequest(
        { orderRequestId: orderId, vendorId: actor.vendorId ?? actor.userId, acceptedAt: new Date().toISOString() },
        buildCommand(actor, "Confirm order from vendor dashboard"),
      );
      toast.success("Order confirmed. Production can now begin.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  if (orders.length === 0) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mx-auto max-w-sm space-y-2 text-center">
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">
              {tab === "Pending"
                ? "No orders awaiting confirmation."
                : tab === "Production"
                  ? "No orders in production."
                  : tab === "Shipping"
                    ? "No orders in shipping."
                    : "No completed orders."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 py-0 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="orderRequest" label="Order ID" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Production Status</TableHead>
              <TableHead>Distribution Status</TableHead>
              <TableHead>Delivery Progress</TableHead>
              <TableHead>
                <SortButton column="created" label="Created" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead>
                <SortButton column="deadline" label="Deadline" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((row) => {
              const deadlineInfo = formatDeadlineInfo(row.deadlineDate, row.createdAt);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/vendor/orders/${row.id}`)}
                >
                  <TableCell className="font-mono text-xs font-medium">{row.orderRequestNumber}</TableCell>
                  <TableCell className="max-w-[260px] text-sm">
                    <div className="truncate">{row.projectName}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <ProductionStatusBadge status={row.productionStatus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DistributionStatusBadge status={row.distributionStatus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="font-medium text-foreground">{row.deliveryProgressPercent}%</span>
                    <span className="ml-1 text-muted-foreground">
                      ({row.deliveryProgressLabel})
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-sm",
                      deadlineInfo.isOverdue
                        ? "font-semibold text-destructive"
                        : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3
                          ? "font-semibold text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {!deadlineInfo.isOverdue && deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      )}
                      {deadlineInfo.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.orderedQuantity}</TableCell>
                  <TableCell className="text-right">
                    {tab === "Pending" && (
                      row.productionStatus === "NEW" ? (
                        <Badge variant="secondary" className="text-xs font-normal">Awaiting Job</Badge>
                      ) : row.productionStatus === "SUBMITTED" ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleConfirmOrder(row.id); }}>
                          Confirm Order
                        </Button>
                      ) : null
                    )}
                    {(tab === "Production" || tab === "Shipping") && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/vendor/update/${row.id}`}>Update Progress</Link>
                      </Button>
                    )}
                    {tab === "History" && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/vendor/update/${row.id}`}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SortButton({
  column,
  label,
  sort,
  onSortChange,
}: {
  column: SortColumn;
  label: string;
  sort: { column: SortColumn; direction: SortDirection };
  onSortChange: (column: SortColumn) => void;
}) {
  const isActive = sort.column === column;
  return (
    <button
      type="button"
      className="-m-1 flex items-center gap-1 rounded-md p-1 text-left font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => onSortChange(column)}
    >
      {label}
      {isActive ? (
        sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}
