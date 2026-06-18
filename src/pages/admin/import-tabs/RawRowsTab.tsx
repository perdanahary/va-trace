import { AlertTriangle, ArrowRight, ArrowUpRight, CheckCircle2, ChevronsRight, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportBatch, ImportBatchRow, DuplicateDecision } from "@/lib/importStore";
import { cn } from "@/lib/utils";
import { EmptyTableState, FlagBadge, MiniAction, PreviewGroupList } from "./shared";

interface RawRowsTabProps {
  batch: ImportBatch;
  summary: { totalRows: number; dispatchedRows: number };
  filteredRows: ImportBatchRow[];
  assignableFilteredRows: ImportBatchRow[];
  selectedRowIds: string[];
  activeFilterCount: number;
  assignmentDraftMatchMap: Map<string, { ruleId: string; vendorName: string }>;
  dispatchReadiness: { dispatchableRows: ImportBatchRow[] } | null;
  canImport: boolean;
  importPreviewEntries: Array<[string, number]>;
  dispatchResultMessage: string | null;
  selectedVendorId: string;
  setSelectedVendorId: (id: string) => void;
  selectedVendorName: string | null;
  suppliers: Array<{ id: string; name: string; status: string }>;
  onCheckedChange: (rowId: string, checked: boolean) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  onMarkDuplicateDecision: (rowId: string, decision: DuplicateDecision) => void;
  onExclude: (rowId: string, excluded: boolean) => void;
  onUnassign: (rowId: string) => void;
  onAssign: () => void;
  onDispatch: () => void;
}

function statusTone(row: ImportBatchRow): "default" | "warning" | "success" | "danger" {
  if (row.status === "dispatched") return "success";
  if (row.status === "assigned") return "success";
  if (row.status === "excluded") return "danger";
  if (row.status === "unresolved") return "warning";
  return "default";
}

function ImportRowTableRow({
  row,
  checked,
  draftVendorName,
  onCheckedChange,
  onDuplicateDecision,
  onExclude,
  onUnassign,
}: {
  row: ImportBatchRow;
  checked: boolean;
  draftVendorName: string | null;
  onCheckedChange: (checked: boolean) => void;
  onDuplicateDecision: (decision: DuplicateDecision) => void;
  onExclude: (excluded: boolean) => void;
  onUnassign: () => void;
}) {
  const isFrozen = row.status === "dispatched";
  const isSelectable =
    row.status === "unassigned" &&
    row.match.issues.length === 0 &&
    (!row.possibleDuplicate || row.duplicateDecision === "include");

  return (
    <TableRow className={cn("align-top text-xs transition-colors", checked && "bg-primary/5", isFrozen && "opacity-60")}>
      <TableCell className="px-4 py-4 sm:px-6">
        <Checkbox checked={checked} disabled={!isSelectable} onCheckedChange={(value) => onCheckedChange(value === true)} />
      </TableCell>
      <TableCell className="px-4 py-4">
        <p className="max-w-[340px] font-semibold leading-5 tracking-[-0.02em] text-slate-950">{row.raw.itemName}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{row.raw.itemCode}</p>
        {row.match.productName && row.match.productName !== row.raw.itemName ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">Matched to: {row.match.productName}</p>
        ) : null}
      </TableCell>
      <TableCell className="px-4 py-4">
        <p className="font-mono text-sm font-semibold text-slate-950">{row.raw.poNumber}</p>
        <p className="mt-1 text-xs normal-case tracking-normal text-slate-500">Line {row.raw.poLine}</p>
      </TableCell>
      <TableCell className="px-4 py-4">
        <p className="font-medium text-slate-950">
          {row.raw.wcode} · {row.raw.salesPoint}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{row.raw.region} · {row.raw.area}</p>
        {row.match.clientName ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Client: {row.match.clientName} · {row.match.clientEntityName}
          </p>
        ) : null}
      </TableCell>
      <TableCell className="px-4 py-4">
        <p className="font-medium text-slate-950">{row.raw.brandNamePo || row.raw.brand || "-"}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{row.raw.category || row.match.categoryName || "-"}</p>
      </TableCell>
      <TableCell className="px-4 py-4 font-semibold text-slate-950">{row.quantity}</TableCell>
      <TableCell className="px-4 py-4">
        <p className={cn("font-medium", row.assignment ? "text-slate-950" : "italic text-slate-500")}>{row.assignment?.vendorName ?? "Not assigned"}</p>
      </TableCell>
      <TableCell className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <FlagBadge label={row.status} tone={statusTone(row)} />
          {draftVendorName && row.status === "unassigned" ? <FlagBadge label={`Rule draft · ${draftVendorName}`} tone="default" /> : null}
          {row.possibleDuplicate ? <FlagBadge label={`Duplicate · ${row.duplicateDecision}`} tone="warning" /> : null}
          {row.match.issues.length > 0 ? <FlagBadge label={`${row.match.issues.length} issue(s)`} tone="danger" /> : null}
        </div>
        {row.match.issues.length > 0 ? (
          <p className="mt-2 max-w-[220px] text-xs leading-5 text-slate-500">{row.match.issues.join(". ")}</p>
        ) : null}
      </TableCell>
      <TableCell className="px-4 py-4 sm:pr-6">
        <div className="flex flex-col items-end gap-2">
          {row.possibleDuplicate && row.status !== "dispatched" ? (
            <div className="flex flex-wrap justify-end gap-2">
              <MiniAction
                label="Import anyway"
                tone={row.duplicateDecision === "include" ? "primary" : "neutral"}
                onClick={() => onDuplicateDecision("include")}
              />
              <MiniAction
                label="Exclude"
                tone={row.duplicateDecision === "exclude" ? "danger" : "neutral"}
                onClick={() => onDuplicateDecision("exclude")}
              />
            </div>
          ) : null}
          {row.assignment && row.status !== "dispatched" ? <MiniAction label="Unassign" tone="neutral" onClick={onUnassign} /> : null}
          {row.status !== "dispatched" && !row.possibleDuplicate ? (
            <MiniAction
              label={row.status === "excluded" ? "Restore" : "Exclude"}
              tone={row.status === "excluded" ? "primary" : "neutral"}
              onClick={() => onExclude(row.status !== "excluded")}
            />
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function RawRowsTab({
  batch,
  summary,
  filteredRows,
  assignableFilteredRows,
  selectedRowIds,
  activeFilterCount,
  assignmentDraftMatchMap,
  dispatchReadiness,
  canImport,
  importPreviewEntries,
  dispatchResultMessage,
  selectedVendorId,
  setSelectedVendorId,
  selectedVendorName,
  suppliers,
  onCheckedChange,
  onSelectAllVisible,
  onClearSelection,
  onMarkDuplicateDecision,
  onExclude,
  onUnassign,
  onAssign,
  onDispatch,
}: RawRowsTabProps) {
  const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE");

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-xs font-semibold normal-case tracking-normal text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={assignableFilteredRows.length === 0}
            onClick={onSelectAllVisible}
            className="h-auto px-0 text-xs font-semibold normal-case tracking-normal text-slate-950 hover:bg-transparent hover:text-primary"
          >
            Select all visible
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-auto px-0 text-xs font-semibold normal-case tracking-normal hover:bg-transparent hover:text-slate-950"
          >
            Clear selection
          </Button>
          {activeFilterCount > 0 ? (
            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-xs normal-case tracking-normal text-primary">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="h-3.5 w-3.5" />
          {filteredRows.length} visible rows · {assignableFilteredRows.length} assignable
        </div>
      </div>

      <Table className="min-w-[1120px] text-left">
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 sm:px-6">Select</TableHead>
            <TableHead className="px-4 py-3">Item</TableHead>
            <TableHead className="px-4 py-3">PO / Line</TableHead>
            <TableHead className="px-4 py-3">Geo</TableHead>
            <TableHead className="px-4 py-3">Brand</TableHead>
            <TableHead className="px-4 py-3">Qty</TableHead>
            <TableHead className="px-4 py-3">Vendor</TableHead>
            <TableHead className="px-4 py-3">Flags</TableHead>
            <TableHead className="px-4 py-3 text-right sm:pr-6">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-200/80">
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="px-6 py-16">
                <EmptyTableState
                  title="No rows match the current scope"
                  body="Widen the filters or switch tab views to bring more import rows back into the workspace."
                />
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row) => (
              <ImportRowTableRow
                key={row.id}
                row={row}
                checked={selectedRowIds.includes(row.id)}
                draftVendorName={assignmentDraftMatchMap.get(row.id)?.vendorName ?? null}
                onCheckedChange={(checked) => onCheckedChange(row.id, checked)}
                onDuplicateDecision={(decision) => onMarkDuplicateDecision(row.id, decision)}
                onExclude={(excluded) => onExclude(row.id, excluded)}
                onUnassign={() => onUnassign(row.id)}
              />
            ))
          )}
        </TableBody>
      </Table>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Operator action</CardDescription>
          <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Manual row operations</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Select rows in the table, then assign a vendor or manage individual row actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
              <span>Selection</span>
              <span>{selectedRowIds.length} selected</span>
            </div>
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
              Vendor: {selectedVendorName ?? "Not selected"}
            </p>

            <label className="grid gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500">
              Assign vendor
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger aria-label="Manual vendor" className="h-11 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                  <SelectValue placeholder="Select vendor..." className="normal-case tracking-normal" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="normal-case tracking-normal">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button
              onClick={onAssign}
              disabled={!selectedVendorId || selectedRowIds.length === 0}
              className="h-11 w-full bg-slate-950 text-white hover:bg-slate-900"
            >
              Assign selected rows
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Import ORs</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                  {dispatchReadiness?.dispatchableRows.length ?? 0} row(s) ready
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-xs normal-case tracking-normal",
                  canImport
                    ? "border-success/20 bg-success/5 text-success"
                    : "border-warning/20 bg-warning/5 text-warning",
                )}
              >
                {canImport ? "Ready" : "Blocked"}
              </Badge>
            </div>

            <Progress value={batch.importJob?.progressPercent ?? (summary.dispatchedRows > 0 ? batch.progressPercent : 0)} className="h-2 bg-white" />

            {importPreviewEntries.length > 0 ? <PreviewGroupList entries={importPreviewEntries} /> : null}

            <Button
              onClick={onDispatch}
              disabled={!canImport}
              className="h-11 w-full bg-slate-950 text-white hover:bg-slate-900"
            >
              {batch.importJob?.status === "failed" ? "Retry import ORs" : "Import assigned ORs"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning" />
                Review duplicates and unresolved rows before assignment.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" />
                Retry skips OR groups that were already created.
              </p>
            </div>

            {dispatchResultMessage ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
                {dispatchResultMessage}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
