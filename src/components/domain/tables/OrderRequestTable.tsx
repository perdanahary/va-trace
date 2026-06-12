import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DistributionStatusBadge,
  ExceptionStateBadge,
  PodStatusBadge,
  ProductionStatusBadge,
} from "@/components/domain/badges/badges";
import { OrderMetadataSummary } from "@/components/shared/OrderMetadataSummary";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";

export type OrderRequestTableColumn =
  | "orderRequest"
  | "clientPo"
  | "client"
  | "project"
  | "vendor"
  | "created"
  | "deadline"
  | "salesPoints"
  | "progress"
  | "production"
  | "distribution"
  | "readyQuantity"
  | "shippedQuantity"
  | "pod"
  | "exception";

interface OrderRequestTableProps {
  rows: OrderListRow[];
  columns?: OrderRequestTableColumn[];
  renderActions?: (row: OrderListRow) => ReactNode;
  detailLabel?: string;
  emptyMessage?: string;
}

const defaultColumns: OrderRequestTableColumn[] = [
  "orderRequest",
  "clientPo",
  "project",
  "vendor",
  "salesPoints",
  "progress",
  "production",
  "distribution",
  "pod",
  "exception",
  "deadline",
];

/** P2-06 — Order Request table bound to `OrderListRow`. */
export function OrderRequestTable({
  rows,
  columns = defaultColumns,
  renderActions,
  detailLabel = "Open",
  emptyMessage = "No order requests found.",
}: OrderRequestTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className={getHeaderClassName(column)}>
                {getColumnLabel(column)}
              </TableHead>
            ))}
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="px-6 py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column} className={getCellClassName(column)}>
                    {renderCell(column, row)}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {renderActions ? (
                    renderActions(row)
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <Link to={row.actionTargets.detailPath}>
                        {detailLabel}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function getColumnLabel(column: OrderRequestTableColumn) {
  switch (column) {
    case "orderRequest":
      return "Order Request";
    case "clientPo":
      return "Client PO";
    case "client":
      return "Client";
    case "project":
      return "Project";
    case "vendor":
      return "Vendor";
    case "created":
      return "Created";
    case "deadline":
      return "Deadline";
    case "salesPoints":
      return "Sales Points";
    case "progress":
      return "Progress";
    case "production":
      return "Production";
    case "distribution":
      return "Distribution";
    case "readyQuantity":
      return "Ready Qty";
    case "shippedQuantity":
      return "Shipped Qty";
    case "pod":
      return "POD";
    case "exception":
      return "Exception";
  }
}

function getHeaderClassName(column: OrderRequestTableColumn) {
  return ["salesPoints", "progress", "readyQuantity", "shippedQuantity"].includes(column) ? "text-right" : undefined;
}

function getCellClassName(column: OrderRequestTableColumn) {
  switch (column) {
    case "salesPoints":
    case "readyQuantity":
    case "shippedQuantity":
      return "text-right text-sm tabular-nums";
    case "progress":
      return "min-w-32 text-right";
    case "production":
    case "distribution":
    case "pod":
    case "exception":
      return "whitespace-nowrap";
    case "clientPo":
    case "orderRequest":
      return "font-mono text-xs";
    case "created":
    case "deadline":
      return "text-xs text-muted-foreground";
    default:
      return "text-sm";
  }
}

function renderCell(column: OrderRequestTableColumn, row: OrderListRow) {
  switch (column) {
    case "orderRequest":
      return (
        <div>
          <Link to={row.actionTargets.detailPath} className="font-medium text-link hover:underline">
            {row.orderRequestNumber}
          </Link>
          {row.legacyStatusLabel ? <p className="mt-1 text-xs text-muted-foreground">{row.legacyStatusLabel}</p> : null}
        </div>
      );
    case "clientPo":
      return row.clientPoNumber ?? "-";
    case "client":
      return row.clientName;
    case "project":
      return (
        <div className="space-y-1">
          <div>{row.projectName}</div>
          <OrderMetadataSummary tags={row.tags} referenceLink={row.referenceLink} />
        </div>
      );
    case "vendor":
      return row.vendorName;
    case "created":
      return formatDate(row.createdAt);
    case "deadline":
      return row.deadlineDate;
    case "salesPoints":
      return row.salesPointCount;
    case "progress":
      return (
        <div>
          <div className="text-sm tabular-nums">{row.deliveryProgressLabel}</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, row.deliveryProgressPercent)}%` }} />
          </div>
        </div>
      );
    case "production":
      return <ProductionStatusBadge status={row.productionStatus} />;
    case "distribution":
      return <DistributionStatusBadge status={row.distributionStatus} />;
    case "readyQuantity":
      return row.productionReadyQuantity;
    case "shippedQuantity":
      return row.shippedQuantity;
    case "pod":
      return <PodStatusBadge status={row.openPodIssueCount > 0 ? "VARIANCE" : row.shippedQuantity > 0 ? "PENDING_UPLOAD" : "NOT_STARTED"} />;
    case "exception":
      return <ExceptionStateBadge status={row.hasException ? "BLOCKED" : "NONE"} />;
  }
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
