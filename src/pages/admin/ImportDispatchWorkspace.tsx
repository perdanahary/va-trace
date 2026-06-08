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

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImportUploadPage } from "@/pages/shared/ImportUploadPage";
import { getImportBatchSummary, type DuplicateDecision, type ImportBatchRow, useImportStore } from "@/lib/importStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";

interface ImportDispatchWorkspaceProps {
  role?: UserRole;
}

type RowView = "Unassigned" | "Assigned" | "Possible duplicate" | "Excluded" | "Unresolved";

const rowViews: RowView[] = ["Unassigned", "Assigned", "Possible duplicate", "Unresolved", "Excluded"];

export function ImportDispatchWorkspace({ role = "admin" }: ImportDispatchWorkspaceProps) {
  const { batches, assignRowsToVendor, unassignRows, markDuplicateDecision, toggleExcluded, dispatchBatch } = useImportStore();
  const { suppliers } = useSupplierStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        [row.raw.itemName, row.raw.itemCode, row.raw.salesPoint, row.raw.poNumber, row.raw.brandNamePo]
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

  const selectedVendorName = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedVendorId)?.name ?? null,
    [selectedVendorId, suppliers],
  );

  const previewGroups = useMemo(() => {
    return selectedRows.reduce<Record<string, number>>((accumulator, row) => {
      const vendorName = selectedVendorName ?? row.assignment?.vendorName ?? "Unassigned";
      const key = `${row.raw.poNumber} · ${row.raw.wcode} · ${vendorName}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [selectedRows, selectedVendorName]);

  const previewEntries = useMemo(() => Object.entries(previewGroups), [previewGroups]);

  const activeFilterCount = [
    regionFilter !== "All Regions",
    brandFilter !== "All Brands",
    categoryFilter !== "All Categories",
    vendorFilter !== "All Vendors",
    wcodeFilter !== "All Sales Points",
    searchTerm.trim().length > 0,
  ].filter(Boolean).length;

  const visibleSelectedCount = selectedRows.length;
  const nextActionLabel =
    summary && summary.unresolvedRows > 0
      ? `${summary.unresolvedRows} rows still need fixes`
      : summary && summary.duplicateRows > 0
        ? `${summary.duplicateRows} duplicates still need a decision`
        : summary && summary.unassignedRows > 0
          ? `${summary.unassignedRows} rows still need a vendor`
          : "Batch is ready to dispatch";

  if (!batch || !summary) {
    return <ImportUploadPage role={role} />;
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
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.08),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.78))]">
      {sidebarOpen ? <Sidebar role={role} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Import Dispatch Workspace"
          showMobileMenu={false}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
            <motion.section
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32 }}
              className="grid gap-4 xl:grid-cols-[1.4fr_0.92fr]"
            >
              <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.28)] backdrop-blur">
                <CardContent className="p-6 sm:p-7">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white hover:bg-slate-950">
                          {batch.stage}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-600">
                          {batch.sourceSheetName}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Dispatch console</p>
                          <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-slate-950 md:text-5xl">
                            Refine, assign, and release import rows without leaving the batch.
                          </h1>
                        </div>
                        <p className="max-w-[62ch] text-sm leading-6 text-slate-600">
                          Use the queue rail to switch between uploads, fix unresolved rows in place, and preview dispatch output before generating ORs.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr]">
                        <StatTile
                          label="Current checkpoint"
                          value={nextActionLabel}
                          supporting={`Viewing ${rowView.toLowerCase()} rows in ${batch.fileName}`}
                          tone="ink"
                        />
                        <StatTile
                          label="Selection"
                          value={`${selectedRowIds.length} row${selectedRowIds.length === 1 ? "" : "s"}`}
                          supporting={selectedVendorName ? `Target vendor: ${selectedVendorName}` : "Choose a vendor to prepare a bulk assignment"}
                        />
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200/80 bg-slate-950 p-5 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Batch status</p>
                          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em]">{batch.fileName}</h2>
                          <p className="mt-1 text-xs text-slate-400">
                            Uploaded by {batch.uploadedBy} · {new Date(batch.uploadedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="min-w-[108px]">
                          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            <span>Progress</span>
                            <span>{batch.progressPercent}%</span>
                          </div>
                          <Progress value={Math.max(batch.progressPercent, 4)} className="h-2 bg-white/10" />
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <MetricPill label="Rows" value={summary.totalRows} />
                        <MetricPill label="Assigned" value={summary.assignedRows} tone="success" />
                        <MetricPill label="Unresolved" value={summary.unresolvedRows} tone="warning" />
                        <MetricPill label="Duplicates" value={summary.duplicateRows} tone="warning" />
                      </div>

                      <div className="mt-5 grid gap-2">
                        <GuideStrip
                          step="01"
                          title="Review conflicts"
                          body={`${summary.unresolvedRows} unresolved row(s) and ${summary.duplicateRows} duplicate row(s) still block clean dispatch.`}
                        />
                        <GuideStrip
                          step="02"
                          title="Assign filtered rows"
                          body="Use search and filter scopes to bulk route rows to a vendor without changing batch context."
                        />
                        <GuideStrip
                          step="03"
                          title="Release OR groups"
                          body="Dispatch creates ORs by PO, vendor, and sales point after the selected rows are clean."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                  <CardContent className="grid gap-3 p-5 sm:grid-cols-[1.35fr_0.75fr_0.75fr]">
                    <SummaryTile label="Unassigned" value={summary.unassignedRows} icon={RotateCcw} tone="warning" />
                    <SummaryTile label="Dispatched" value={summary.dispatchedRows} icon={CheckCircle2} tone="success" />
                    <SummaryTile label="Visible rows" value={filteredRows.length} icon={Filter} />
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Workspace pulse</CardDescription>
                    <CardTitle className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                      Keep the table focused on the next decision.
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <PulseRow label="Current view" value={rowView} />
                    <PulseRow label="Filters active" value={activeFilterCount} />
                    <PulseRow label="Preview groups" value={previewEntries.length} />
                  </CardContent>
                </Card>
              </div>
            </motion.section>

            <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <motion.aside
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: 0.04 }}
                className="space-y-5 xl:sticky xl:top-24 xl:self-start"
              >
                <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardDescription className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Batch queue</CardDescription>
                        <CardTitle className="mt-1 text-lg font-semibold tracking-[-0.04em] text-slate-950">Resumable uploads</CardTitle>
                      </div>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-white/80 text-[10px] uppercase tracking-[0.24em] text-slate-600">
                        {batches.length} total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {batches.map((entry) => {
                      const cardSummary = getImportBatchSummary(entry);
                      const isActive = entry.id === batch.id;

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedBatchId(entry.id);
                            setSelectedRowIds([]);
                            setDispatchResultMessage(null);
                          }}
                          className={cn(
                            "w-full rounded-[1.5rem] border px-4 py-4 text-left transition-all duration-200",
                            isActive
                              ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.8)]"
                              : "border-slate-200/80 bg-white/70 text-slate-950 hover:-translate-y-[1px] hover:border-slate-300",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold tracking-[-0.02em]">{entry.fileName}</p>
                              <p className={cn("mt-1 text-[10px] uppercase tracking-[0.24em]", isActive ? "text-slate-300" : "text-slate-500")}>
                                {entry.stage} · {entry.rows.length} rows
                              </p>
                            </div>
                            <div className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]", isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600")}>
                              {entry.progressPercent}%
                            </div>
                          </div>

                          <div className={cn("mt-4 grid grid-cols-2 gap-2 text-[11px]", isActive ? "text-slate-200" : "text-slate-600")}>
                            <QueueStat label="Assigned" value={cardSummary.assignedRows} />
                            <QueueStat label="Pending" value={cardSummary.unresolvedRows + cardSummary.duplicateRows} />
                            <QueueStat label="Ready" value={cardSummary.dispatchedRows} />
                            <QueueStat label="Open" value={cardSummary.unassignedRows} />
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Selection state</CardDescription>
                    <CardTitle className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Current focus</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StateBlock label="Rows selected" value={`${selectedRowIds.length}`} />
                    <StateBlock label="Visible selected" value={`${visibleSelectedCount}`} />
                    <StateBlock label="Target vendor" value={selectedVendorName ?? "Not selected"} />
                  </CardContent>
                </Card>
              </motion.aside>

              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.08 }}
                className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_360px]"
              >
                <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/92 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                  <CardContent className="p-0">
                    <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Row workspace</p>
                            <h2 className="text-2xl font-semibold tracking-[-0.05em] text-slate-950">Search, isolate, and resolve rows in one pass.</h2>
                          </div>
                          <div className="relative w-full max-w-xl">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              value={searchTerm}
                              onChange={(event) => setSearchTerm(event.target.value)}
                              placeholder="Search item name, PO, item code, or brand"
                              className="h-11 rounded-xl border-slate-200 bg-white pl-10 shadow-none"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {rowViews.map((view) => (
                            <Button
                              key={view}
                              type="button"
                              variant={rowView === view ? "default" : "outline"}
                              size="sm"
                              onClick={() => setRowView(view)}
                              className={cn(
                                "h-9 rounded-full px-3.5 text-[10px] font-semibold uppercase tracking-[0.24em]",
                                rowView === view ? "bg-slate-950 text-white hover:bg-slate-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              {view}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
                        <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={availableRegions} />
                        <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={availableBrands} />
                        <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={availableCategories} />
                        <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={availableVendors} />
                        <FilterSelect label="Sales Point" value={wcodeFilter} onChange={setWcodeFilter} options={availableSalesPoints} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={handleSelectAllVisible} className="text-slate-950 transition-colors hover:text-cyan-700">
                          Select all visible
                        </button>
                        <button type="button" onClick={() => setSelectedRowIds([])} className="transition-colors hover:text-slate-950">
                          Clear selection
                        </button>
                        {activeFilterCount > 0 ? (
                          <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-[10px] uppercase tracking-[0.24em] text-cyan-800">
                            {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 text-slate-500">
                        <Filter className="h-3.5 w-3.5" />
                        {filteredRows.length} visible rows
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[1120px] w-full text-left">
                        <thead className="sticky top-0 z-[1] bg-slate-50/95 text-[10px] uppercase tracking-[0.24em] text-slate-500 backdrop-blur">
                          <tr>
                            <th className="px-4 py-3 sm:px-6">Select</th>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">PO / Line</th>
                            <th className="px-4 py-3">Geo</th>
                            <th className="px-4 py-3">Brand</th>
                            <th className="px-4 py-3">Qty</th>
                            <th className="px-4 py-3">Vendor</th>
                            <th className="px-4 py-3">Flags</th>
                            <th className="px-4 py-3 text-right sm:pr-6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-6 py-16">
                                <EmptyTableState
                                  title="No rows match the current scope"
                                  body="Widen the filters or switch row views to bring more import rows back into the workspace."
                                />
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

                <div className="space-y-5">
                  <Card className="rounded-[2rem] border-white/80 bg-white/92 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Bulk assignment</CardDescription>
                      <CardTitle className="text-lg font-semibold tracking-[-0.04em] text-slate-950">Route selected rows to a vendor</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        Assigned rows leave the default queue immediately and remain available under the assigned view for a final dispatch check.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Selection</p>
                        <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{selectedRowIds.length}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Rows selected across the current filtered scope.</p>
                      </div>

                      <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Assign vendor
                        <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
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

                      <Button
                        onClick={handleAssign}
                        disabled={!selectedVendorId || selectedRowIds.length === 0}
                        className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-900"
                      >
                        Assign selected rows
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2rem] border-white/80 bg-white/92 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        <Sparkles className="h-4 w-4 text-cyan-700" />
                        Dispatch preview
                      </CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        Preview resulting OR groups by PO, vendor, and sales point before releasing the batch.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {previewEntries.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                          Select rows to generate preview groups. The rail updates live as you change the vendor or scope.
                        </div>
                      ) : (
                        previewEntries.map(([key, count]) => (
                          <div key={key} className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold leading-5 tracking-[-0.02em] text-slate-950">{key}</p>
                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Dispatch output group</p>
                              </div>
                              <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] uppercase tracking-[0.24em] text-slate-600">
                                {count} row(s)
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                    <CardContent className="space-y-4 border-t border-slate-200/80 p-5">
                      <Button onClick={handleDispatch} className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-900">
                        Dispatch assigned rows
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      <div className="space-y-2 text-sm leading-6 text-slate-600">
                        <p className="flex items-start gap-2">
                          <AlertTriangle className="mt-1 h-4 w-4 text-amber-500" />
                          Duplicate rows with pending decisions are held back from OR creation.
                        </p>
                        <p className="flex items-start gap-2">
                          <XCircle className="mt-1 h-4 w-4 text-rose-500" />
                          Unresolved rows stay in the batch until fixed or explicitly excluded.
                        </p>
                      </div>

                      {dispatchResultMessage ? (
                        <Alert className="rounded-[1.5rem] border-cyan-200 bg-cyan-50 text-cyan-950">
                          <AlertTitle>Dispatch result</AlertTitle>
                          <AlertDescription>{dispatchResultMessage}</AlertDescription>
                        </Alert>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>
              </motion.section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function GuideStrip({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Step {step}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : tone === "success"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
        : "border-white/10 bg-white/5 text-slate-100";

  return (
    <div className={cn("rounded-[1.25rem] border p-3.5", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</p>
    </div>
  );
}

function StatTile({
  label,
  value,
  supporting,
  tone = "default",
}: {
  label: string;
  value: string;
  supporting: string;
  tone?: "default" | "ink";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border p-4",
        tone === "ink"
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.72)]"
          : "border-slate-200/80 bg-slate-50 text-slate-950",
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.28em]", tone === "ink" ? "text-slate-300" : "text-slate-500")}>{label}</p>
      <p className="mt-3 text-lg font-semibold tracking-[-0.04em]">{value}</p>
      <p className={cn("mt-2 text-sm leading-6", tone === "ink" ? "text-slate-300" : "text-slate-600")}>{supporting}</p>
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
      ? "bg-amber-100 text-amber-700"
      : tone === "success"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-cyan-100 text-cyan-800";

  return (
    <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function PulseRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200/80 bg-slate-50 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <span className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{value}</span>
    </div>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function StateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{value}</p>
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
    <label className="grid gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
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

function EmptyTableState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
        <Search className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
        <p className="text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
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
    <tr className={cn("align-top text-xs transition-colors", checked && "bg-cyan-50/70", isFrozen && "opacity-60")}>
      <td className="px-4 py-4 sm:px-6">
        <input
          type="checkbox"
          checked={checked}
          disabled={isFrozen}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
        />
      </td>
      <td className="px-4 py-4">
        <p className="max-w-[340px] font-semibold leading-5 tracking-[-0.02em] text-slate-950">{row.raw.itemName}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{row.raw.itemCode}</p>
        {row.match.productName && row.match.productName !== row.raw.itemName ? (
          <p className="mt-2 text-[10px] leading-5 text-slate-500">Matched to: {row.match.productName}</p>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <p className="font-mono text-sm font-semibold text-slate-950">{row.raw.poNumber}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">Line {row.raw.poLine}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-slate-950">{row.raw.wcode} · {row.raw.salesPoint}</p>
        <p className="mt-1 text-[10px] leading-5 text-slate-500">{row.raw.region} · {row.raw.area}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-slate-950">{row.raw.brandNamePo || row.raw.brand || "-"}</p>
        <p className="mt-1 text-[10px] leading-5 text-slate-500">{row.raw.category || row.match.categoryName || "-"}</p>
      </td>
      <td className="px-4 py-4 font-semibold text-slate-950">{row.quantity}</td>
      <td className="px-4 py-4">
        <p className={cn("font-medium", row.assignment ? "text-slate-950" : "italic text-slate-500")}>{row.assignment?.vendorName ?? "Not assigned"}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <FlagBadge label={row.status} tone={statusTone(row)} />
          {row.possibleDuplicate ? <FlagBadge label={`Duplicate · ${row.duplicateDecision}`} tone="warning" /> : null}
          {row.match.issues.length > 0 ? <FlagBadge label={`${row.match.issues.length} issue(s)`} tone="danger" /> : null}
        </div>
        {row.match.issues.length > 0 ? (
          <p className="mt-2 max-w-[220px] text-[10px] leading-5 text-slate-500">{row.match.issues.join(". ")}</p>
        ) : null}
      </td>
      <td className="px-4 py-4 sm:pr-6">
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
      ? "bg-amber-100 text-amber-800"
      : tone === "success"
        ? "bg-emerald-100 text-emerald-800"
        : tone === "danger"
          ? "bg-rose-100 text-rose-800"
          : "bg-slate-100 text-slate-600";

  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]", classes)}>{label}</span>;
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
      ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] transition-all active:translate-y-px",
        classes,
      )}
    >
      {label}
    </button>
  );
}
