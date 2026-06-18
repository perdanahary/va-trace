import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  onQuantityChange: (jobId: string, field: "producedQuantity" | "completedQuantity", value: number) => void;
  getDraftQuantity: (jobId: string, field: "producedQuantity" | "completedQuantity") => number | undefined;
  getDraftStatus: (jobId: string) => ProductionStatus | undefined;
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
  const draftStatus = ctx.getDraftStatus(job.id);
  const hasAutoStatus = draftStatus !== undefined && draftStatus !== job.status;

  if (allowed.length === 0) {
    return <ProductionStatusBadge status={job.status} />;
  }

  return (
    <div className="flex items-center gap-1">
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
      {hasAutoStatus && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          <ProductionStatusBadge status={draftStatus} />
        </span>
      )}
    </div>
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
          <span className="font-mono text-xs font-medium">
            {getValue<string>()}
          </span>
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
            header: () => <span className="block text-center">Prod.</span>,
            cell: ({ row }) => {
              const draft = ctx.getDraftQuantity(row.original.id, "producedQuantity");
              const value = draft ?? row.original.producedQuantity;
              return (
                <div className="flex items-center justify-center">
                  <Input
                    type="number"
                    min={0}
                    max={row.original.orderedQuantity}
                    value={value}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 0) ctx.onQuantityChange(row.original.id, "producedQuantity", n);
                    }}
                    className="h-8 w-20 text-center tabular-nums text-sm"
                  />
                </div>
              );
            },
            size: 90,
          },
          {
            accessorKey: "completedQuantity",
            id: "completedQuantity",
            header: () => <span className="block text-center">Finish</span>,
            cell: ({ row }) => {
              const draft = ctx.getDraftQuantity(row.original.id, "completedQuantity");
              const value = draft ?? row.original.completedQuantity;
              return (
                <div className="flex items-center justify-center">
                  <Input
                    type="number"
                    min={0}
                    max={row.original.orderedQuantity}
                    value={value}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n >= 0) ctx.onQuantityChange(row.original.id, "completedQuantity", n);
                    }}
                    className="h-8 w-20 text-center tabular-nums text-sm"
                  />
                </div>
              );
            },
            size: 90,
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
    ],
    [orderId, userRole, ctx.onStatusChange, ctx.onQuantityChange, ctx.getDraftQuantity, ctx.getDraftStatus],
  );
}
