import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import type { ProductionJob, ProductionJobListRow } from "@/lib/types/v2/production";
import type { ProductionStatus } from "@/lib/types/v2/status";

export interface ColumnContext {
  orderId: string;
  userRole: string;
  onStatusChange: (jobId: string, status: ProductionStatus) => void;
}

const STATUS_TRANSITIONS: Record<ProductionStatus, ProductionStatus[]> = {
  NEW: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "CANCELLED", "EXCEPTION"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED", "EXCEPTION"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED", "EXCEPTION"],
  COMPLETED: [],
  CANCELLED: [],
  EXCEPTION: ["IN_PROGRESS", "CANCELLED"],
};

function StatusCell({ job, ctx }: { job: ProductionJob; ctx: ColumnContext }) {
  const allowed = useMemo(() => STATUS_TRANSITIONS[job.status] ?? [], [job.status]);

  if (allowed.length === 0) {
    return <ProductionStatusBadge status={job.status} />;
  }

  return (
    <Select
      value={job.status}
      onValueChange={(value) => ctx.onStatusChange(job.id, value as ProductionStatus)}
    >
      <SelectTrigger className="h-7 w-[130px] border-0 p-0 shadow-none hover:bg-muted/40">
        <ProductionStatusBadge status={job.status} />
      </SelectTrigger>
      <SelectContent>
        {allowed.map((s) => (
          <SelectItem key={s} value={s}>
            {formatStatusLabel(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function useColumns(ctx: ColumnContext): ColumnDef<ProductionJobListRow>[] {
  const { orderId, userRole } = ctx;

  return useMemo<ColumnDef<ProductionJobListRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.jobNumber}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: "jobNumber",
        header: "Job",
        cell: ({ getValue, row }) => (
          <Link
            to={`/${userRole}/orders/${orderId}/production/${row.original.id}`}
            className="font-mono text-xs font-medium text-link hover:underline"
          >
            {getValue<string>()}
          </Link>
        ),
        size: 100,
      },
      {
        accessorKey: "orderItem",
        header: "Product",
        cell: ({ getValue }) => {
          const item = getValue() as ProductionJobListRow["orderItem"];
          return (
            <div className="max-w-56">
              <p className="truncate text-sm">{item.name}</p>
              {item.code && (
                <p className="truncate font-mono text-xs text-muted-foreground">{item.code}</p>
              )}
            </div>
          );
        },
        size: 200,
      },
      {
        id: "quantities",
        header: "Quantities",
        columns: [
          {
            accessorKey: "orderedQuantity",
            id: "orderedQuantity",
            header: () => <span className="block text-right">Ordered</span>,
            cell: ({ getValue }) => (
              <span className="block text-right text-sm tabular-nums">{getValue<number>()}</span>
            ),
            size: 80,
          },
          {
            accessorKey: "producedQuantity",
            id: "producedQuantity",
            header: () => <span className="block text-right">Prod.</span>,
            cell: ({ getValue }) => (
              <span className="block text-right text-sm tabular-nums">{getValue<number>()}</span>
            ),
            size: 72,
          },
          {
            accessorKey: "completedQuantity",
            id: "completedQuantity",
            header: () => <span className="block text-right">Finish</span>,
            cell: ({ getValue }) => (
              <span className="block text-right text-sm tabular-nums">{getValue<number>()}</span>
            ),
            size: 72,
          },
        ],
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusCell job={row.original as unknown as ProductionJob} ctx={ctx} />
        ),
        size: 140,
      },
      {
        accessorKey: "deadline",
        header: "Deadline",
        cell: ({ getValue }) => {
          const v = getValue<string | undefined>();
          return v ? (
            <span className="text-xs text-muted-foreground">
              {new Date(v).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
        size: 100,
      },
    ],
    [orderId, userRole, ctx.onStatusChange],
  );
}
