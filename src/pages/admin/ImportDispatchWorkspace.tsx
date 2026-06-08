import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronsRight,
  FileWarning,
  Filter,
  PackageOpen,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getImportBatchSummary, type ImportBatchRow, type DuplicateDecision, useImportStore } from "@/lib/importStore";
import { useSupplierStore } from "@/lib/supplierStore";

interface ImportDispatchWorkspaceProps {
  role?: UserRole;
}

type RowView = "Unassigned" | "Assigned" | "Possible duplicate" | "Excluded" | "Unresolved";

export function ImportDispatchWorkspace({ role = "admin" }: ImportDispatchWorkspaceProps) {
  const { batches, assignRowsToVendor, unassignRows, markDuplicateDecision, toggleExcluded, dispatchBatch } = useImportStore();
  const { suppliers } = useSupplierStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowView, setRowView] = useState<RowView>("Unassigned");
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [wcodeFilter, setWcodeFilter] = useState("All Sales Points");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [dispatchResultMessage, setDispatchResultMessage] = useState<string | null>(null);

  const batch = useMemo(
    () => batches.find((entry) => entry.id === selectedBatchId) ?? batches[0] ?? null,
    [batches, selectedBatchId],
  );

  useEffect(() => {
    if (!batch) {
      return;
    }

    setSelectedBatchId(batch.id);
  }, [batch]);

  useEffect(() => {
    if (!batch) {
      setSelectedRowIds([]);
      return;
    }

    setSelectedRowIds((current) => current.filter((rowId) => batch.rows.some((row) => row.id === rowId)));
  }, [batch]);

  const summary = useMemo(() => (batch ? getImportBatchSummary(batch) : null), [batch]);

  const availableRegions = useMemo(
    () => ["All Regions", ...new Set((batch?.rows ?? []).map((row) => row.raw.region).filter(Boolean))],
    [batch],
  );
  const availableBrands = useMemo(
    () => ["All Brands", ...new Set((batch?.rows ?? []).map((row) => row.raw.brandNamePo || row.raw.brand).filter(Boolean))],
    [batch],
  );
  const availableCategories = useMemo(
    () => ["All Categories", ...new Set((batch?.rows ?? []).map((row) => row.raw.category || row.match.categoryName || "-").filter(Boolean))],
    [batch],
  );
  const availableSalesPoints = useMemo(
    () => ["All Sales Points", ...new Set((batch?.rows ?? []).map((row) => `${row.raw.wcode} · ${row.raw.salesPoint}`))],
    [batch],
  );
  const availableVendors = useMemo(
    () => ["All Vendors", ...new Set((batch?.rows ?? []).map((row) => row.assignment?.vendorName).filter(Boolean) as string[])],
    [batch],
  );

  const filteredRows = useMemo(() => {
    if (!batch) {
      return [];
    }

    const query = searchTerm.trim().toLowerCase();

    return batch.rows.filter((row) => {
      const matchesRowView =
        (rowView === "Unassigned" && row.status === "unassigned") ||
        (rowView === "Assigned" && row.status === "assigned") ||
        (rowView === "Possible duplicate" && row.possibleDuplicate && row.status !== "dispatched") ||
        (rowView === "Excluded" && row.status === "excluded") ||
        (rowView === "Unresolved" && row.match.issues.length > 0 && row.status !== "excluded" && row.status !== "dispatched");

      const matchesSearch =
        !query ||
        [
          row.raw.itemName,
          row.raw.itemCode,
          row.raw.salesPoint,
          row.raw.poNumber,
          row.raw.brandNamePo,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

      const matchesRegion = regionFilter === "All Regions" || row.raw.region === regionFilter;
      const matchesBrand = brandFilter === "All Brands" || (row.raw.brandNamePo || row.raw.brand) === brandFilter;
      const matchesCategory =
        categoryFilter === "All Categories" || (row.raw.category || row.match.categoryName || "-") === categoryFilter;
      const matchesVendor = vendorFilter === "All Vendors" || row.assignment?.vendorName === vendorFilter;
      const matchesWcode =
        wcodeFilter === "All Sales Points" || `${row.raw.wcode} · ${row.raw.salesPoint}` === wcodeFilter;

      return matchesRowView && matchesSearch && matchesRegion && matchesBrand && matchesCategory && matchesVendor && matchesWcode;
    });
  }, [batch, brandFilter, categoryFilter, regionFilter, rowView, searchTerm, vendorFilter, wcodeFilter]);

  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedRowIds.includes(row.id)),
    [filteredRows, selectedRowIds],
  );
  const previewGroups = useMemo(() => {
    return selectedRows.reduce<Record<string, number>>((accumulator, row) => {
      const vendorName = selectedVendorId
        ? suppliers.find((supplier) => supplier.id === selectedVendorId)?.name ?? "Selected vendor"
        : row.assignment?.vendorName ?? "Unassigned";
      const key = `${vendorName} · ${row.raw.wcode}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [selectedRows, selectedVendorId, suppliers]);

  if (!batch || !summary) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role={role} />
        <div className="flex-1">
          <Header title="Import Dispatch Workspace" />
          <main className="p-8">
            <Card className="mx-auto max-w-xl border-border/70 shadow-sm">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">No import batches available yet.</CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const handleSelectAllVisible = () => {
    setSelectedRowIds(filteredRows.map((row) => row.id));
  };

  const handleAssign = () => {
    if (!selectedVendorId || selectedRowIds.length === 0) {
      return;
    }

    assignRowsToVendor(batch.id, selectedRowIds, selectedVendorId);
    setDispatchResultMessage(null);
    setSelectedRowIds([]);
    setRowView("Assigned");
  };

  const handleDispatch = () => {
    const result = dispatchBatch(batch.id);
    const parts = [];

    if (result.createdOrderIds.length > 0) {
      parts.push(`${result.createdOrderIds.length} OR created`);
    }
    if (result.pendingDuplicateCount > 0) {
      parts.push(`${result.pendingDuplicateCount} duplicate row(s) still need a decision`);
    }
    if (result.unresolvedAssignedCount > 0) {
      parts.push(`${result.unresolvedAssignedCount} assigned row(s) still unresolved`);
    }
    if (result.remainingUnassignedCount > 0) {
      parts.push(`${result.remainingUnassignedCount} row(s) remain unassigned`);
    }

    setDispatchResultMessage(parts.join(" · ") || "No eligible rows were dispatched.");
    setSelectedRowIds([]);
    setRowView("Assigned");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title="Import Dispatch Workspace" />

        <main className="space-y-6 p-8">
          <section className="grid gap-4 xl:grid-cols-[0.9fr_2.1fr]">
            <motion.aside initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div>
                    <CardDescription>Open batches</CardDescription>
                    <CardTitle className="mt-2 text-base">Resumable working space</CardTitle>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                    {batches.length} total
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {batches.map((entry) => {
                    const cardSummary = getImportBatchSummary(entry);

                    return (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setSelectedBatchId(entry.id);
                          setSelectedRowIds([]);
                          setDispatchResultMessage(null);
                        }}
                        className={cn(
                          "w-full rounded-lg border p-4 text-left transition-colors",
                          entry.id === batch.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30",
                        )}
                      >
                        <p className="truncate text-xs font-bold text-foreground">{entry.fileName}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {entry.stage} · {entry.rows.length} rows
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                          <span>{cardSummary.assignedRows} assigned</span>
                          <span>{cardSummary.unresolvedRows} unresolved</span>
                          <span>{cardSummary.duplicateRows} duplicate</span>
                          <span>{cardSummary.dispatchedRows} dispatched</span>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dispatch Rule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    One dispatch creates <span className="font-semibold text-foreground">1 OR per vendor per sales point (`Wcode`)</span>.
                  </p>
                  <p>
                    Assigned rows stay in this batch until they are dispatched. Unassigned, unresolved, or pending-duplicate rows stay visible for follow-up.
                  </p>
                </CardContent>
              </Card>
            </motion.aside>

            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">{batch.sourceSheetName}</p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">{batch.fileName}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploaded by {batch.uploadedBy} · {new Date(batch.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                      {batch.stage}
                    </Badge>
                    <div className="w-40">
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Progress</span>
                        <span>{batch.progressPercent}%</span>
                      </div>
                      <Progress value={Math.max(batch.progressPercent, 4)} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <SummaryTile label="Total rows" value={summary.totalRows} icon={PackageOpen} />
                  <SummaryTile label="Unresolved" value={summary.unresolvedRows} icon={ShieldAlert} tone="warning" />
                  <SummaryTile label="Unassigned" value={summary.unassignedRows} icon={RotateCcw} tone="warning" />
                  <SummaryTile label="Assigned" value={summary.assignedRows} icon={Truck} tone="success" />
                  <SummaryTile label="Duplicates" value={summary.duplicateRows} icon={FileWarning} tone="warning" />
                  <SummaryTile label="Dispatched" value={summary.dispatchedRows} icon={CheckCircle2} tone="success" />
                </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.75fr_0.85fr]">
                <Card className="border-border/70 shadow-sm">
                  <CardContent className="p-0">
                  <div className="border-b border-border p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="relative w-full xl:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search item name, PO, item code, or brand"
                          className="pl-9"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(["Unassigned", "Assigned", "Possible duplicate", "Unresolved", "Excluded"] as RowView[]).map((view) => (
                          <Button
                            key={view}
                            type="button"
                            variant={rowView === view ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRowView(view)}
                            className="h-8 rounded-full px-3 text-[10px] font-bold uppercase tracking-widest"
                          >
                            {view}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={availableRegions} />
                      <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={availableBrands} />
                      <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={availableCategories} />
                      <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={availableVendors} />
                      <FilterSelect label="Sales Point" value={wcodeFilter} onChange={setWcodeFilter} options={availableSalesPoints} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-border px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handleSelectAllVisible} className="text-primary hover:underline">
                        Select all visible
                      </button>
                      <button type="button" onClick={() => setSelectedRowIds([])} className="hover:text-foreground">
                        Clear selection
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5" />
                      {filteredRows.length} visible rows
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[1180px] w-full text-left">
                      <thead className="sticky top-0 z-[1] bg-accent/40 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3">Select</th>
                          <th className="px-4 py-3">Item</th>
                          <th className="px-4 py-3">PO / Line</th>
                          <th className="px-4 py-3">Geo</th>
                          <th className="px-4 py-3">Brand</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3">Flags</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                              No rows match the current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row) => (
                            <ImportRowTableRow
                              key={row.id}
                              row={row}
                              checked={selectedRowIds.includes(row.id)}
                              onCheckedChange={(checked) =>
                                setSelectedRowIds((current) =>
                                  checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id),
                                )
                              }
                              onDuplicateDecision={(decision) => markDuplicateDecision(batch.id, row.id, decision)}
                              onExclude={(excluded) => toggleExcluded(batch.id, row.id, excluded)}
                              onUnassign={() => unassignRows(batch.id, [row.id])}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardDescription>Bulk assignment</CardDescription>
                      <CardTitle className="text-base">Assign filtered rows to vendor</CardTitle>
                      <CardDescription>
                        Selected rows are assigned in place and leave the default `Unassigned` view. They remain available under `Assigned`.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/20 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Selection</p>
                        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{selectedRowIds.length}</p>
                        <p className="mt-1 text-xs text-muted-foreground">rows selected across the current filtered view</p>
                      </div>

                      <div className="space-y-3">
                        <label className="space-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Assign vendor
                          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor..." />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers
                                .filter((supplier) => supplier.status === "ACTIVE")
                                .map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </label>
                        <Button onClick={handleAssign} disabled={!selectedVendorId || selectedRowIds.length === 0} className="w-full">
                          Assign selected rows
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Dispatch preview
                      </CardTitle>
                      <CardDescription>Preview resulting OR groups by vendor and sales point.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.keys(previewGroups).length === 0 ? (
                        <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                          Select rows to preview resulting OR groups by vendor and sales point.
                        </div>
                      ) : (
                        Object.entries(previewGroups).map(([key, count]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
                            <div>
                              <p className="text-xs font-semibold text-foreground">{key}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Dispatch output group</p>
                            </div>
                            <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                              {count} row(s)
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                    <CardContent className="space-y-4 border-t p-5">
                      <Button onClick={handleDispatch} className="w-full bg-foreground text-white hover:bg-foreground/90">
                        Dispatch assigned rows
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      <div className="space-y-2 text-xs text-muted-foreground">
                        <p className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning" />
                          Duplicate rows with pending decisions are held back.
                        </p>
                        <p className="flex items-start gap-2">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 text-destructive" />
                          Unresolved rows stay in the batch until fixed or excluded.
                        </p>
                      </div>

                      {dispatchResultMessage ? (
                        <Alert className="border-primary/20 bg-primary/5">
                          <AlertTitle>Dispatch result</AlertTitle>
                          <AlertDescription>{dispatchResultMessage}</AlertDescription>
                        </Alert>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.section>
          </section>
        </main>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof PackageOpen;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "success"
        ? "bg-success/10 text-success"
        : "bg-primary/10 text-primary";

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function ImportRowTableRow({
  row,
  checked,
  onCheckedChange,
  onDuplicateDecision,
  onExclude,
  onUnassign,
}: {
  row: ImportBatchRow;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onDuplicateDecision: (decision: DuplicateDecision) => void;
  onExclude: (excluded: boolean) => void;
  onUnassign: () => void;
}) {
  const isFrozen = row.status === "dispatched";

  return (
    <tr className={cn("align-top text-xs", checked && "bg-primary/5", isFrozen && "opacity-60")}>
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={checked}
          disabled={isFrozen}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
      </td>
      <td className="px-4 py-4">
        <p className="max-w-[340px] font-bold leading-tight text-foreground">{row.raw.itemName}</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.raw.itemCode}</p>
        {row.match.productName && row.match.productName !== row.raw.itemName && (
          <p className="mt-2 text-[10px] text-muted-foreground">Matched to: {row.match.productName}</p>
        )}
      </td>
      <td className="px-4 py-4">
        <p className="font-mono font-bold text-foreground">{row.raw.poNumber}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Line {row.raw.poLine}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-foreground">{row.raw.wcode} · {row.raw.salesPoint}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{row.raw.region} · {row.raw.area}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-foreground">{row.raw.brandNamePo || row.raw.brand || "-"}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{row.raw.category || row.match.categoryName || "-"}</p>
      </td>
      <td className="px-4 py-4 font-bold text-foreground">{row.quantity}</td>
      <td className="px-4 py-4">
        <p className={cn("font-medium", row.assignment ? "text-foreground" : "text-muted-foreground italic")}>
          {row.assignment?.vendorName ?? "Not assigned"}
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <FlagBadge label={row.status} tone={statusTone(row)} />
          {row.possibleDuplicate && <FlagBadge label={`Duplicate · ${row.duplicateDecision}`} tone="warning" />}
          {row.match.issues.length > 0 && <FlagBadge label={`${row.match.issues.length} issue(s)`} tone="danger" />}
        </div>
        {row.match.issues.length > 0 && (
          <p className="mt-2 max-w-[220px] text-[10px] leading-relaxed text-muted-foreground">
            {row.match.issues.join(". ")}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col items-end gap-2">
          {row.possibleDuplicate && row.status !== "dispatched" && (
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
          )}
          {row.assignment && row.status !== "dispatched" && (
            <MiniAction label="Unassign" tone="neutral" onClick={onUnassign} />
          )}
          {row.status !== "dispatched" && !row.possibleDuplicate && (
            <MiniAction
              label={row.status === "excluded" ? "Restore" : "Exclude"}
              tone={row.status === "excluded" ? "primary" : "neutral"}
              onClick={() => onExclude(row.status !== "excluded")}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function statusTone(row: ImportBatchRow): "default" | "warning" | "success" | "danger" {
  if (row.status === "dispatched") return "success";
  if (row.status === "assigned") return "success";
  if (row.status === "excluded") return "danger";
  if (row.status === "unresolved") return "warning";
  return "default";
}

function FlagBadge({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "warning" | "success" | "danger";
}) {
  const classes =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-accent text-muted-foreground";

  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest", classes)}>{label}</span>;
}

function MiniAction({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "primary" | "danger" | "neutral";
  onClick: () => void;
}) {
  const classes =
    tone === "primary"
      ? "border-primary bg-primary/10 text-primary"
      : tone === "danger"
        ? "border-destructive bg-destructive/10 text-destructive"
        : "border-border bg-white text-muted-foreground hover:text-foreground";

  return (
    <button
      onClick={onClick}
      className={cn("rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors", classes)}
    >
      {label}
    </button>
  );
}
