import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronsRight, CircleDot, Filter, ListChecks, PackageOpen, RotateCcw, Search, Send, Sparkles, XCircle } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImportUploadPage } from "@/pages/shared/ImportUploadPage";
import { getDispatchReadiness, getImportBatchSummary, type DuplicateDecision, type ImportBatchRow, useImportStore } from "@/lib/importStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportDispatchWorkspaceProps {
  role?: UserRole;
}

type RowView = "Unassigned" | "Assigned" | "Possible duplicate" | "Excluded" | "Unresolved" | "Imported";

const rowViews: RowView[] = ["Possible duplicate", "Unresolved", "Unassigned", "Assigned", "Imported", "Excluded"];

function getPriorityRowView(summary: ReturnType<typeof getImportBatchSummary>): RowView {
  if (summary.pendingDuplicateRows > 0) return "Possible duplicate";
  if (summary.unresolvedRows > 0) return "Unresolved";
  return "Unassigned";
}

export function ImportDispatchWorkspace({ role = "admin" }: ImportDispatchWorkspaceProps) {
  const {
    batches,
    isHydrating,
    assignRowsToVendor,
    unassignRows,
    markDuplicateDecision,
    toggleExcluded,
    dispatchBatch,
    clearImportBatches,
  } =
    useImportStore();
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
  const priorityBatchId = useRef("");

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

  useEffect(() => {
    if (!batch || !summary || priorityBatchId.current === batch.id) {
      return;
    }

    priorityBatchId.current = batch.id;
    setRowView(getPriorityRowView(summary));
  }, [batch, summary]);

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
        (rowView === "Possible duplicate" && row.possibleDuplicate && row.status !== "dispatched" && row.status !== "excluded") ||
        (rowView === "Excluded" && row.status === "excluded") ||
        (rowView === "Imported" && row.status === "dispatched") ||
        (rowView === "Unresolved" && row.match.issues.length > 0 && row.status !== "excluded" && row.status !== "dispatched");

      const matchesSearch =
        !query ||
        [
          row.raw.itemName,
          row.raw.itemCode,
          row.raw.salesPoint,
          row.raw.poNumber,
          row.raw.brandNamePo,
          row.match.customerName,
          row.match.customerEntityName,
        ]
          .filter((value): value is string => Boolean(value))
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

  const dispatchReadiness = useMemo(() => (batch ? getDispatchReadiness(batch) : null), [batch]);

  const assignableFilteredRows = useMemo(
    () =>
      filteredRows.filter(
        (row) =>
          row.status === "unassigned" &&
          row.match.issues.length === 0 &&
          (!row.possibleDuplicate || row.duplicateDecision === "include"),
      ),
    [filteredRows],
  );

  const selectedVendorName = useMemo(
    () => suppliers.find((supplier) => supplier.id === selectedVendorId)?.name ?? null,
    [selectedVendorId, suppliers],
  );

  const assignmentPreviewGroups = useMemo(() => {
    return selectedRows.reduce<Record<string, number>>((accumulator, row) => {
      const vendorName = selectedVendorName ?? row.assignment?.vendorName ?? "Unassigned";
      const key = `${row.raw.poNumber} · ${row.raw.wcode} · ${vendorName}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [selectedRows, selectedVendorName]);

  const assignmentPreviewEntries = useMemo(() => Object.entries(assignmentPreviewGroups), [assignmentPreviewGroups]);

  const importPreviewEntries = useMemo(() => {
    return (dispatchReadiness?.dispatchableRows ?? []).reduce<Array<[string, number]>>((entries, row) => {
      const key = `${row.raw.poNumber} · ${row.raw.wcode} · ${row.assignment?.vendorName ?? "Unassigned"}`;
      const existing = entries.find(([entryKey]) => entryKey === key);

      if (existing) {
        existing[1] += 1;
      } else {
        entries.push([key, 1]);
      }

      return entries;
    }, []);
  }, [dispatchReadiness]);

  const activeFilterCount = [
    regionFilter !== "All Regions",
    brandFilter !== "All Brands",
    categoryFilter !== "All Categories",
    vendorFilter !== "All Vendors",
    wcodeFilter !== "All Sales Points",
    searchTerm.trim().length > 0,
  ].filter(Boolean).length;

  const visibleSelectedCount = selectedRows.length;
  const canImport = Boolean(
    summary &&
      dispatchReadiness &&
      dispatchReadiness.dispatchableRows.length > 0 &&
      summary.blockerRows === 0 &&
      summary.unassignedRows === 0,
  );
  if (isHydrating) {
    return (
      <div className="flex min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.08),_transparent_28%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.78))]">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header title="Import Dispatch Workspace" showMobileMenu={false} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
              <Card className="rounded-[2rem] border-white/80 bg-white/88 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur">
                <CardContent className="p-6 text-sm text-slate-600">Loading staged import batches...</CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!batch || !summary) {
    return <ImportUploadPage role={role} />;
  }

  const handleSelectAllVisible = () => {
    setSelectedRowIds(assignableFilteredRows.map((row) => row.id));
  };

  const handleAssign = () => {
    if (!selectedVendorId || selectedRowIds.length === 0) {
      return;
    }

    assignRowsToVendor(batch.id, selectedRowIds, selectedVendorId);
    setDispatchResultMessage(null);
    setSelectedRowIds([]);
    setRowView("Unassigned");
  };

  const handleDispatch = () => {
    const result = dispatchBatch(batch.id);
    const parts = [];

    if (result.createdOrderIds.length > 0) {
      parts.push(`${result.createdOrderIds.length} OR created`);
    }
    if (result.skippedExistingOrderIds.length > 0) {
      parts.push(`${result.skippedExistingOrderIds.length} existing OR skipped`);
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
    setRowView("Imported");
  };

  const handleResetQueue = async () => {
    const confirmed = window.confirm("Clear all staged import batches? You will return to the upload screen and can import a new file.");

    if (!confirmed) {
      return;
    }

    try {
      await clearImportBatches();
      setSelectedBatchId("");
      setSelectedRowIds([]);
      setSearchTerm("");
      setRowView("Unassigned");
      setRegionFilter("All Regions");
      setBrandFilter("All Brands");
      setCategoryFilter("All Categories");
      setVendorFilter("All Vendors");
      setWcodeFilter("All Sales Points");
      setSelectedVendorId("");
      setDispatchResultMessage(null);
      toast.success("Import queue cleared. Upload a new file to start over.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear import queue.");
    }
  };

  const headerActions = (
    <Button variant="destructive" onClick={() => void handleResetQueue()}>
      <RotateCcw className="h-4 w-4" />
      Clear queue and start over
    </Button>
  );

  const rowViewCounts: Record<RowView, number> = {
    "Possible duplicate": summary.pendingDuplicateRows,
    Unresolved: summary.unresolvedRows,
    Unassigned: summary.unassignedRows,
    Assigned: summary.assignedRows,
    Imported: summary.dispatchedRows,
    Excluded: summary.excludedRows,
  };
  const assignmentProgressLabel = `${summary.assignedRows + summary.dispatchedRows + summary.excludedRows}/${summary.totalRows}`;

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-[linear-gradient(180deg,_#f8fbfc_0%,_#eef3f6_100%)]">
      {sidebarOpen ? <Sidebar role={role} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title="Import Dispatch Workspace"
          showMobileMenu={false}
          actions={headerActions}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5">
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.08 }}
                className="min-w-0"
              >
                <Card className="overflow-hidden rounded-[1.5rem] border-slate-200/70 bg-white/95 shadow-[0_22px_64px_-36px_rgba(15,23,42,0.22)]">
                  <CardContent className="p-0">
                    <div className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 sm:px-6">
                      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                        <div className="min-w-0">
                          <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Active import batch</CardDescription>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <CardTitle className="max-w-[720px] truncate text-lg font-semibold tracking-[-0.04em] text-slate-950">
                              {batch.fileName}
                            </CardTitle>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                              {batches.length} upload{batches.length === 1 ? "" : "s"}
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                              {batch.validationStatus.replaceAll("_", " ")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs font-medium normal-case tracking-normal text-slate-500">
                            {batch.stage} · {summary.totalRows} rows · Assignment progress {assignmentProgressLabel}
                          </p>

                          {batches.length > 1 ? (
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                              {batches.map((entry) => {
                                const isActive = entry.id === batch.id;
                                const entrySummary = getImportBatchSummary(entry);

                                return (
                                  <Button
                                    key={entry.id}
                                    type="button"
                                    variant={isActive ? "default" : "outline"}
                                    onClick={() => {
                                      setSelectedBatchId(entry.id);
                                      setSelectedRowIds([]);
                                      setDispatchResultMessage(null);
                                      priorityBatchId.current = "";
                                    }}
                                    className={cn(
                                      "h-9 min-w-[220px] justify-between rounded-full px-3 text-xs font-semibold normal-case tracking-normal",
                                      isActive
                                        ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-900"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                                    )}
                                  >
                                    <span className="truncate">{entry.fileName}</span>
                                    <span>{entrySummary.blockerRows} blockers</span>
                                  </Button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid min-w-[320px] gap-3 sm:grid-cols-3">
                          <BatchMetric label="Progress" value={`${batch.progressPercent}%`} detail={assignmentProgressLabel} tone={batch.validationStatus === "blocked" ? "warning" : "default"} />
                          <BatchMetric label="Blockers" value={`${summary.blockerRows}`} detail={`${summary.pendingDuplicateRows} dup · ${summary.unresolvedRows} unresolved`} tone={summary.blockerRows > 0 ? "danger" : "success"} />
                          <BatchMetric label="Ready" value={`${dispatchReadiness?.dispatchableRows.length ?? 0}`} detail={`${summary.unassignedRows} unassigned`} tone={canImport ? "success" : "default"} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 lg:grid-cols-3">
                        <WorkflowStep
                          icon={AlertCircle}
                          label="1. Review blockers"
                          value={summary.blockerRows === 0 ? "Clear" : `${summary.blockerRows} to review`}
                          active={rowView === "Possible duplicate" || rowView === "Unresolved"}
                          complete={summary.blockerRows === 0}
                        />
                        <WorkflowStep
                          icon={ListChecks}
                          label="2. Assign rows"
                          value={summary.unassignedRows === 0 ? "No open rows" : `${summary.unassignedRows} remaining`}
                          active={rowView === "Unassigned"}
                          complete={summary.unassignedRows === 0 && summary.blockerRows === 0}
                        />
                        <WorkflowStep
                          icon={Send}
                          label="3. Import ORs"
                          value={canImport ? "Ready to import" : `${dispatchReadiness?.dispatchableRows.length ?? 0} ready`}
                          active={rowView === "Assigned" || rowView === "Imported"}
                          complete={batch.validationStatus === "imported"}
                        />
                      </div>
                    </div>

                    <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex items-center gap-4">
                            <Tabs value={rowView} onValueChange={(value) => setRowView(value as RowView)} className="w-auto">
                              <TabsList>
                                {rowViews.map((view) => (
                                  <TabsTrigger key={view} value={view} className="px-4">
                                    {view}
                                    <span className="ml-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-slate-500">
                                      {rowViewCounts[view]}
                                    </span>
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                            </Tabs>
                          </div>

                          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                            <div className="relative w-full max-w-2xl">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                placeholder="Search item, PO, item code, customer, or brand"
                                className="pl-9"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={availableRegions} />
                          <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={availableBrands} />
                          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={availableCategories} />
                          <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={availableVendors} />
                          <FilterSelect label="Sales Point" value={wcodeFilter} onChange={setWcodeFilter} options={availableSalesPoints} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4 text-xs font-semibold normal-case tracking-normal text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={assignableFilteredRows.length === 0}
                          onClick={handleSelectAllVisible}
                          className="h-auto px-0 text-xs font-semibold normal-case tracking-normal text-slate-950 hover:bg-transparent hover:text-cyan-700"
                        >
                          Select all visible
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRowIds([])}
                          className="h-auto px-0 text-xs font-semibold normal-case tracking-normal hover:bg-transparent hover:text-slate-950"
                        >
                          Clear selection
                        </Button>
                        {activeFilterCount > 0 ? (
                          <Badge variant="outline" className="rounded-full border-cyan-200 bg-cyan-50 text-xs normal-case tracking-normal text-cyan-800">
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
                      <TableHeader className="sticky top-0 z-[1] bg-white/95 text-xs normal-case tracking-normal text-slate-500 backdrop-blur">
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
                                body="Widen the filters or switch row views to bring more import rows back into the workspace."
                              />
                            </TableCell>
                          </TableRow>
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
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </motion.section>

              <motion.aside
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: 0.04 }}
                className="space-y-3 xl:sticky xl:top-24 xl:self-start"
              >
                <Card className="rounded-[1.4rem] border-slate-200/70 bg-white/95 shadow-[0_16px_48px_-30px_rgba(15,23,42,0.22)]">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Operator action</CardDescription>
                    <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Assign, then import ORs</CardTitle>
                    <CardDescription className="text-sm leading-6 text-slate-600">
                      Work from the filtered rows. Assigned rows leave the open queue.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
                        <span>{selectedRowIds.length} selected</span>
                        <span>{visibleSelectedCount} visible</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
                        Vendor: {selectedVendorName ?? "Not selected"}
                      </p>
                    </div>

                    <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
                      Assign vendor
                      <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                          <SelectValue placeholder="Select vendor..." className="normal-case tracking-normal" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers
                            .filter((supplier) => supplier.status === "ACTIVE")
                            .map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id} className="normal-case tracking-normal">
                                {supplier.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </label>

                    <Button
                      onClick={handleAssign}
                      disabled={!selectedVendorId || selectedRowIds.length === 0}
                      className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-900"
                    >
                      Assign selected rows
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>

                    <div className="space-y-2 rounded-[1.1rem] border border-slate-200 bg-white p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Assignment OR preview</p>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs normal-case tracking-normal text-slate-600">
                          {assignmentPreviewEntries.length} group{assignmentPreviewEntries.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      {assignmentPreviewEntries.length === 0 ? (
                        <p className="text-xs leading-5 text-slate-500">Select assignable rows and a vendor to preview the OR groups that selection will feed.</p>
                      ) : (
                        <PreviewGroupList entries={assignmentPreviewEntries} />
                      )}
                    </div>

                    <div className="space-y-3 rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3.5">
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
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700",
                          )}
                        >
                          {canImport ? "Ready" : "Blocked"}
                        </Badge>
                      </div>

                      <Progress value={batch.importJob?.progressPercent ?? (summary.dispatchedRows > 0 ? batch.progressPercent : 0)} className="h-2 bg-white" />

                      {importPreviewEntries.length > 0 ? <PreviewGroupList entries={importPreviewEntries} /> : null}

                      <Button
                        onClick={handleDispatch}
                        disabled={!canImport}
                        className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-900"
                      >
                        {batch.importJob?.status === "failed" ? "Retry import ORs" : "Import assigned ORs"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      <div className="space-y-2 text-xs leading-5 text-slate-600">
                        <p className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                          Review duplicates and unresolved rows before assignment.
                        </p>
                        <p className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                          Retry skips OR groups that were already created.
                        </p>
                      </div>

                      {dispatchResultMessage ? (
                        <Alert className="rounded-[1.1rem] border-cyan-200 bg-cyan-50 text-cyan-950">
                          <AlertTitle>Import result</AlertTitle>
                          <AlertDescription>{dispatchResultMessage}</AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </motion.aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function BatchMetric({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={cn("rounded-[1rem] border px-3 py-2.5", classes)}>
      <p className="text-[11px] font-semibold normal-case tracking-normal opacity-75">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-[11px] font-semibold normal-case tracking-normal opacity-75">{detail}</p>
    </div>
  );
}

function WorkflowStep({
  icon: Icon,
  label,
  value,
  active,
  complete,
}: {
  icon: typeof CircleDot;
  label: string;
  value: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[1rem] border px-3.5 py-3 text-sm",
        complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : active
            ? "border-cyan-200 bg-cyan-50 text-cyan-950"
            : "border-slate-200 bg-white text-slate-700",
      )}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", complete ? "bg-emerald-100 text-emerald-700" : active ? "bg-cyan-100 text-cyan-800" : "bg-slate-100 text-slate-500")}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold tracking-[-0.02em]">{label}</p>
        <p className="mt-0.5 text-xs font-medium normal-case tracking-normal opacity-70">{value}</p>
      </div>
    </div>
  );
}

function PreviewGroupList({ entries }: { entries: Array<[string, number]> }) {
  return (
    <div className="space-y-2">
      {entries.slice(0, 4).map(([key, count]) => (
        <div key={key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="min-w-0 text-xs font-semibold leading-5 tracking-[-0.01em] text-slate-700">{key}</p>
          <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-slate-50 text-[11px] normal-case tracking-normal text-slate-600">
            {count}
          </Badge>
        </div>
      ))}
      {entries.length > 4 ? (
        <p className="text-xs font-medium normal-case tracking-normal text-slate-500">+{entries.length - 4} more group(s)</p>
      ) : null}
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
    <Card className="gap-0 py-0 border-slate-200/80 bg-white/90 shadow-sm">
      <CardContent className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div>
          <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">{label}</p>
          <p className="mt-0.5 text-xl font-semibold leading-none tracking-[-0.04em] text-slate-950">{value}</p>
        </div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", toneClass)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function PulseRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2.5">
      <span className="text-xs font-semibold normal-case tracking-normal text-slate-500">{label}</span>
      <span className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{value}</span>
    </div>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function StateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50 p-4">
      <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">{label}</p>
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
    <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white normal-case tracking-normal">
          <SelectValue className="normal-case tracking-normal" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="normal-case tracking-normal">
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
  const isSelectable =
    row.status === "unassigned" &&
    row.match.issues.length === 0 &&
    (!row.possibleDuplicate || row.duplicateDecision === "include");

  return (
    <TableRow className={cn("align-top text-xs transition-colors", checked && "bg-cyan-50/70", isFrozen && "opacity-60")}>
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
        {row.match.customerName ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Customer: {row.match.customerName} · {row.match.customerEntityName}
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

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs font-semibold normal-case tracking-normal", classes)}>
      {label}
    </Badge>
  );
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
    <Button
      type="button"
      variant={tone === "danger" ? "destructive" : tone === "primary" ? "secondary" : "outline"}
      size="xs"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 text-xs font-semibold normal-case tracking-normal transition-all active:translate-y-px",
        classes,
      )}
    >
      {label}
    </Button>
  );
}
