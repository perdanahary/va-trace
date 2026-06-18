import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  type RowSelectionState,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductionJobListRow } from "@/lib/types/v2/production";
import type { ProductionStatus } from "@/lib/types/v2/status";
import { useColumns, type ColumnContext } from "./BulkJobTableColumns";

interface BulkJobTableProps {
  rows: ProductionJobListRow[];
  orderId: string;
  userRole: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onStatusChange: (jobId: string, status: ProductionStatus) => void;
}

export function BulkJobTable({
  rows,
  orderId,
  userRole,
  selectedIds,
  onSelectionChange,
  onStatusChange,
}: BulkJobTableProps) {
  const ctx: ColumnContext = useMemo(
    () => ({ orderId, userRole, onStatusChange }),
    [orderId, userRole, onStatusChange],
  );
  const columns = useColumns(ctx);

  const rowSelection: RowSelectionState = useMemo(() => {
    const sel: RowSelectionState = {};
    rows.forEach((r, i) => {
      if (selectedIds.has(r.id)) sel[i] = true;
    });
    return sel;
  }, [rows, selectedIds]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      const ids = new Set(rows.filter((_, i) => next[i]).map((r) => r.id));
      onSelectionChange(ids);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    enableSorting: false,
  });

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No production jobs match the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
