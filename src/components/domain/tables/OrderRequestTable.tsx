import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DistributionStatusBadge,
  ExceptionStateBadge,
  PodStatusBadge,
  ProductionStatusBadge,
} from "@/components/domain/badges/badges";
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
  | "orderedQuantity"
  | "exception";

export type SortDirection = "asc" | "desc";

export type SortableColumn = "orderRequest" | "created" | "deadline";

interface SortState {
  column: SortableColumn;
  direction: SortDirection;
}

interface OrderRequestTableProps {
  rows: OrderListRow[];
  columns?: OrderRequestTableColumn[];
  renderActions?: (row: OrderListRow) => ReactNode;
  detailLabel?: string;
  emptyMessage?: string;
  onRowClick?: (row: OrderListRow) => void;
  sort?: SortState;
  onSortChange?: (column: SortableColumn) => void;
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
  onRowClick,
  sort,
  onSortChange,
}: OrderRequestTableProps) {
  const sortableColumns: SortableColumn[] = ["orderRequest", "created", "deadline"];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column} className={getHeaderClassName(column)}>
                {sortableColumns.includes(column as SortableColumn) && onSortChange ? (
                  <button
                    type="button"
                    className="-m-1 flex items-center gap-1 rounded-md p-1 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => onSortChange(column as SortableColumn)}
                  >
                    {getColumnLabel(column)}
                    <SortIcon active={sort?.column === column} direction={sort?.column === column ? sort.direction : undefined} />
                  </button>
                ) : (
                  getColumnLabel(column)
                )}
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
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column} className={getCellClassName(column)}>
                    {renderCell(column, row, onRowClick)}
                  </TableCell>
                ))}
                <TableCell className="text-right" onClick={onRowClick ? (e) => e.stopPropagation() : undefined}>
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

function SortIcon({ active, direction }: { active?: boolean; direction?: SortDirection }) {
  if (!active) {
    return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
  }
  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" />
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
    case "orderedQuantity":
      return "Ordered Qty";
    case "readyQuantity":
      return "Ready Qty";
    case "shippedQuantity":
      return "Shipped Qty";
    case "pod":
      return "Proof of Delivery (POD)";
    case "exception":
      return "Exception";
  }
}

function getHeaderClassName(column: OrderRequestTableColumn) {
  return ["salesPoints", "progress", "orderedQuantity", "readyQuantity", "shippedQuantity"].includes(column) ? "text-right" : undefined;
}

function getCellClassName(column: OrderRequestTableColumn) {
  switch (column) {
    case "salesPoints":
    case "orderedQuantity":
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
      return "font-mono text-sm";
    case "created":
    case "deadline":
      return "text-sm text-muted-foreground";
    default:
      return "text-sm";
  }
}

function renderCell(column: OrderRequestTableColumn, row: OrderListRow, onRowClick?: (row: OrderListRow) => void) {
  switch (column) {
    case "orderRequest":
      return onRowClick ? (
        <div>
          <span className="font-medium">{row.orderRequestNumber}</span>
        </div>
      ) : (
        <div>
          <Link to={row.actionTargets.detailPath} className="font-medium text-link hover:underline">
            {row.orderRequestNumber}
          </Link>
        </div>
      );
    case "clientPo":
      return row.clientPoNumber ?? "-";
    case "client":
      return row.clientName;
    case "project":
      return row.projectName;
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
    case "orderedQuantity":
      return row.orderedQuantity;
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
