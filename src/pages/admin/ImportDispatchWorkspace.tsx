import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, FileText, Filter, Layers, ListChecks, PackageOpen, RotateCcw, Search, Send, Table2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { ContentArea } from "@/components/layout/ContentArea";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportUploadPage } from "@/pages/shared/ImportUploadPage";
import {
  getDispatchReadiness,
  getImportBatchSummary,
  type DuplicateDecision,
  type ImportAssignmentRuleCondition,
  type ImportBatchRow,
  useImportStore,
} from "@/lib/importStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  IssueGroupsTab,
  AssignmentGroupsTab,
  RawRowsTab,
  ORPreviewTab,
  ImportLogTab,
  FilterSelect,
  EmptyTableState,
  toIssueLabel,
  ruleFieldOptions,
  type WorkspaceTab,
  type RuleConditionDraft,
  type IssueSummary,
  type AssignmentGroup,
  type OrPreviewVendor,
  type AssignmentDraftSummary,
} from "./import-tabs";

interface ImportDispatchWorkspaceProps {
  userRole?: UserRole;
}

function getDefaultTab(summary: ReturnType<typeof getImportBatchSummary> | null): WorkspaceTab {
  if (!summary) return "issue-groups";
  if (summary.blockerRows > 0) return "issue-groups";
  if (summary.unassignedRows > 0) return "assignment-groups";
  if (summary.assignedRows > 0) return "or-preview";
  return "import-log";
}

function getRuleFieldLabel(field: ImportAssignmentRuleCondition["field"]) {
  return ruleFieldOptions.find((option) => option.value === field)?.label ?? field;
}

export function ImportDispatchWorkspace({ userRole = "admin" }: ImportDispatchWorkspaceProps) {
  const {
    batches,
    isHydrating,
    createAssignmentRule,
    deleteAssignmentRule,
    moveAssignmentRule,
    previewAssignmentRules,
    clearAssignmentDraft,
    approveAssignmentDraft,
    assignRowsToVendor,
    unassignRows,
    markDuplicateDecision,
    markDuplicateDecisionForRows,
    toggleExcluded,
    toggleExcludedForRows,
    dispatchBatch,
    clearImportBatches,
  } =
    useImportStore();
  const navigate = useNavigate();
  const { suppliers } = useSupplierStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("issue-groups");
  const [regionFilter, setRegionFilter] = useState("All Regions");
  const [brandFilter, setBrandFilter] = useState("All Brands");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [wcodeFilter, setWcodeFilter] = useState("All Sales Points");
  const [cycleFilter, setCycleFilter] = useState("All Cycles");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [ruleVendorId, setRuleVendorId] = useState("");
  const [ruleConditions, setRuleConditions] = useState<RuleConditionDraft[]>([{ field: "region", value: "" }]);
  const [dispatchResultMessage, setDispatchResultMessage] = useState<string | null>(null);
  const [expandedOrVendor, setExpandedOrVendor] = useState<string | null>(null);
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
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
    setActiveTab(getDefaultTab(summary));
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
  const availableCycles = useMemo(
    () => ["All Cycles", ...new Set((batch?.rows ?? []).map((row) => row.raw.cycle).filter(Boolean))],
    [batch],
  );
  const availableVendors = useMemo(
    () => ["All Vendors", ...new Set((batch?.rows ?? []).map((row) => row.assignment?.vendorName).filter(Boolean) as string[])],
    [batch],
  );
  const ruleValueOptions = useMemo(
    () => ({
      region: availableRegions.filter((option) => option !== "All Regions"),
      brand: availableBrands.filter((option) => option !== "All Brands"),
      category: availableCategories.filter((option) => option !== "All Categories"),
      salesPoint: availableSalesPoints.filter((option) => option !== "All Sales Points"),
    }),
    [availableBrands, availableCategories, availableRegions, availableSalesPoints],
  );

  useEffect(() => {
    setRuleVendorId("");
    setRuleConditions([{ field: "region", value: "" }]);
  }, [batch?.id]);

  const filteredRows = useMemo(() => {
    if (!batch) {
      return [];
    }

    const query = searchTerm.trim().toLowerCase();

    return batch.rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.raw.itemName,
          row.raw.itemCode,
          row.raw.salesPoint,
          row.raw.poNumber,
          row.raw.brandNamePo,
          row.match.clientName,
          row.match.clientEntityName,
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

      const matchesCycle = cycleFilter === "All Cycles" || row.raw.cycle === cycleFilter;

      return matchesSearch && matchesRegion && matchesBrand && matchesCategory && matchesVendor && matchesWcode && matchesCycle;
    });
  }, [batch, brandFilter, categoryFilter, regionFilter, activeTab, searchTerm, vendorFilter, wcodeFilter, cycleFilter]);

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
  const ruleVendorName = useMemo(
    () => suppliers.find((supplier) => supplier.id === ruleVendorId)?.name ?? null,
    [ruleVendorId, suppliers],
  );
  const issueSummaries = useMemo(() => {
    const allRows = batch?.rows ?? [];

    const issueMap = new Map<
      string,
      {
        key: string;
        label: string;
        rowIds: string[];
        rows: ImportBatchRow[];
      }
    >();

    allRows.forEach((row) => {
      if (row.status === "excluded" || row.status === "dispatched") return;
      row.match.issues.forEach((issue) => {
        const key = issue.trim();
        const existing = issueMap.get(key);

        if (existing) {
          existing.rowIds.push(row.id);
          existing.rows.push(row);
          return;
        }

        issueMap.set(key, {
          key,
          label: toIssueLabel(issue),
          rowIds: [row.id],
          rows: [row],
        });
      });
    });

    return Array.from(issueMap.values()).sort((left, right) => right.rowIds.length - left.rowIds.length);
  }, [batch]);

  const duplicateSummary = useMemo(() => {
    const activeRows = (batch?.rows ?? []).filter(
      (row) => row.possibleDuplicate && row.duplicateDecision === "pending" && row.status !== "excluded" && row.status !== "dispatched",
    );
    if (activeRows.length === 0) return null;

    return {
      key: "possible-duplicate",
      label: "Possible duplicate",
      rowIds: activeRows.map((row) => row.id),
      rows: activeRows,
    };
  }, [batch]);

  const assignmentPreviewGroups = useMemo(() => {
    return selectedRows.reduce<Record<string, number>>((accumulator, row) => {
      const vendorName = selectedVendorName ?? row.assignment?.vendorName ?? "Unassigned";
      const key = `${row.raw.poNumber} · ${row.raw.wcode} · ${vendorName}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [selectedRows, selectedVendorName]);

  const assignmentPreviewEntries = useMemo(() => Object.entries(assignmentPreviewGroups), [assignmentPreviewGroups]);
  const assignmentDraftMatchMap = useMemo(
    () =>
      new Map(
        (batch?.assignmentDraft?.matchedRows ?? []).map((match) => [
          match.rowId,
          {
            ruleId: match.ruleId,
            vendorName: match.vendorName,
          },
        ]),
      ),
    [batch?.assignmentDraft],
  );
  const assignmentDraftSummary = useMemo(() => {
    const matches = batch?.assignmentDraft?.matchedRows ?? [];
    const matchedRowIds = new Set(matches.map((match) => match.rowId));
    const eligibleRows = (batch?.rows ?? []).filter(
      (row) =>
        row.status === "unassigned" &&
        row.match.issues.length === 0 &&
        (!row.possibleDuplicate || row.duplicateDecision === "include"),
    );
    const blockedRows = (batch?.rows ?? []).filter(
      (row) =>
        row.status === "unassigned" &&
        (row.match.issues.length > 0 || (row.possibleDuplicate && row.duplicateDecision === "pending")),
    );
    const ruleCounts = (batch?.assignmentRules ?? []).map((rule) => ({
      ruleId: rule.id,
      vendorName: rule.vendorName,
      count: matches.filter((match) => match.ruleId === rule.id).length,
      summary: rule.conditions.map((condition) => `${getRuleFieldLabel(condition.field)}: ${condition.value}`).join(" · "),
    }));

    return {
      matchedCount: matches.length,
      unmatchedCount: eligibleRows.filter((row) => !matchedRowIds.has(row.id)).length,
      blockedCount: blockedRows.length,
      ruleCounts,
    };
  }, [batch]);

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

  const assignmentGroups = useMemo(() => {
    if (activeTab !== "assignment-groups") return [];

    const eligibleRows = (batch?.rows ?? []).filter(
      (row) =>
        row.status === "unassigned" &&
        row.match.issues.length === 0 &&
        (!row.possibleDuplicate || row.duplicateDecision === "include"),
    );

    const groups = new Map<string, {
      key: string;
      label: string;
      rows: ImportBatchRow[];
      totalQty: number;
      salesPoints: Set<string>;
      region: string;
      itemCode: string;
      brand: string;
      category: string;
    }>();

    eligibleRows.forEach((row) => {
      const region = row.raw.region || "Unknown Region";
      const brand = row.raw.brandNamePo || row.raw.brand || "Unknown Brand";
      const category = row.raw.category || row.match.categoryName || "Uncategorized";
      const key = `${region} · ${brand} · ${category}`;

      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
        existing.totalQty += row.quantity;
        existing.salesPoints.add(`${row.raw.wcode} · ${row.raw.salesPoint}`);
      } else {
        groups.set(key, {
          key,
          label: key,
          rows: [row],
          totalQty: row.quantity,
          salesPoints: new Set([`${row.raw.wcode} · ${row.raw.salesPoint}`]),
          region,
          itemCode: row.raw.itemCode || "",
          brand,
          category,
        });
      }
    });

    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        rowCount: g.rows.length,
        salesPointCount: g.salesPoints.size,
        salesPointsList: Array.from(g.salesPoints),
      }))
      .sort((a, b) => b.rowCount - a.rowCount);
  }, [batch, activeTab]);

  const orPreviewData = useMemo(() => {
    if (!dispatchReadiness) return [];

    const vendorMap = new Map<string, {
      vendorName: string;
      rows: ImportBatchRow[];
      totalQty: number;
      sourcePOs: Set<string>;
      regions: Set<string>;
      salesPoints: Set<string>;
      orGroups: Map<string, ImportBatchRow[]>;
    }>();

    dispatchReadiness.dispatchableRows.forEach((row) => {
      const vendorName = row.assignment?.vendorName || "Unknown";
      const existing = vendorMap.get(vendorName);

      if (existing) {
        existing.rows.push(row);
        existing.totalQty += row.quantity;
        if (row.raw.poNumber) existing.sourcePOs.add(row.raw.poNumber);
        if (row.raw.region) existing.regions.add(row.raw.region);
        existing.salesPoints.add(`${row.raw.wcode} · ${row.raw.salesPoint}`);

        const orKey = `${row.raw.poNumber} · ${row.raw.wcode}`;
        const subGroup = existing.orGroups.get(orKey);
        if (subGroup) subGroup.push(row);
        else existing.orGroups.set(orKey, [row]);
      } else {
        const orGroups = new Map<string, ImportBatchRow[]>();
        const orKey = `${row.raw.poNumber} · ${row.raw.wcode}`;
        orGroups.set(orKey, [row]);

        vendorMap.set(vendorName, {
          vendorName,
          rows: [row],
          totalQty: row.quantity,
          sourcePOs: new Set(row.raw.poNumber ? [row.raw.poNumber] : []),
          regions: new Set(row.raw.region ? [row.raw.region] : []),
          salesPoints: new Set([`${row.raw.wcode} · ${row.raw.salesPoint}`]),
          orGroups,
        });
      }
    });

    return Array.from(vendorMap.values()).map((v) => ({
      ...v,
      sourcePOsList: Array.from(v.sourcePOs),
      regionsList: Array.from(v.regions),
      salesPointCount: v.salesPoints.size,
      orGroupCount: v.orGroups.size,
      orGroupEntries: Array.from(v.orGroups.entries()).map(([key, groupRows]) => ({
        key,
        rows: groupRows,
        count: groupRows.length,
        totalQty: groupRows.reduce((sum, r) => sum + r.quantity, 0),
      })),
    }));
  }, [dispatchReadiness]);

  const recommendedNextAction = useMemo(() => {
    if (!summary) return null;
    if (summary.blockerRows > 0) {
      if (duplicateSummary && duplicateSummary.rowIds.length > 0) {
        return { text: `${duplicateSummary.rowIds.length} possible duplicate(s) need review before proceeding.`, tab: "issue-groups" as WorkspaceTab, cta: "Review duplicates" };
      }
      if (issueSummaries.length > 0) {
        const top = issueSummaries[0];
        return { text: `Resolve "${top.label}" affecting ${top.rowIds.length} rows.`, tab: "issue-groups" as WorkspaceTab, cta: "Review issue groups" };
      }
    }
    if (summary.unassignedRows > 0) {
      return { text: `${summary.unassignedRows} rows need vendor assignment (${assignmentGroups.length} groups).`, tab: "assignment-groups" as WorkspaceTab, cta: "Assign vendors" };
    }
    if (summary.assignedRows > 0 && summary.blockerRows === 0) {
      const count = dispatchReadiness?.dispatchableRows.length ?? 0;
      return { text: `${count} row(s) ready to import. Review OR preview before creating.`, tab: "or-preview" as WorkspaceTab, cta: "Preview ORs" };
    }
    return null;
  }, [summary, duplicateSummary, issueSummaries, assignmentGroups.length, dispatchReadiness]);

  const activeFilterCount = [
    regionFilter !== "All Regions",
    brandFilter !== "All Brands",
    categoryFilter !== "All Categories",
    vendorFilter !== "All Vendors",
    wcodeFilter !== "All Sales Points",
    searchTerm.trim().length > 0,
  ].filter(Boolean).length;

  const canImport = Boolean(
    summary &&
      dispatchReadiness &&
      dispatchReadiness.dispatchableRows.length > 0 &&
      summary.blockerRows === 0,
  );

  const tabCounts: Record<WorkspaceTab, number> = {
    "issue-groups": (duplicateSummary?.rowIds.length ?? 0) + issueSummaries.reduce((sum, i) => sum + i.rowIds.length, 0),
    "assignment-groups": assignmentGroups.reduce((sum, g) => sum + g.rowCount, 0),
    "raw-rows": batch?.rows.length ?? 0,
    "or-preview": dispatchReadiness?.dispatchableRows.length ?? 0,
    "import-log": batch?.dispatchRuns.length ?? 0,
  };

  if (isHydrating) {
    return (
      <div className="flex min-h-[100dvh] overflow-x-hidden bg-slate-50">
        <Sidebar userRole={userRole} />
        <ContentArea className="flex flex-col">
          <Header title="Import Dispatch Workspace" showMobileMenu={false} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
              <Card>
                <CardContent className="p-6 text-sm text-slate-600">Loading staged import batches...</CardContent>
              </Card>
            </div>
          </main>
        </ContentArea>
      </div>
    );
  }

  if (!batch || !summary) {
    return <ImportUploadPage userRole={userRole} />;
  }

  const updateRuleCondition = (index: number, nextCondition: Partial<RuleConditionDraft>) => {
    setRuleConditions((current) =>
      current.map((condition, conditionIndex) => {
        if (conditionIndex !== index) {
          return condition;
        }

        const nextField = nextCondition.field ?? condition.field;
        const nextValue =
          nextCondition.field && nextCondition.field !== condition.field ? "" : (nextCondition.value ?? condition.value);

        return {
          field: nextField,
          value: nextValue,
        };
      }),
    );
  };

  const addRuleCondition = () => {
    setRuleConditions((current) => {
      if (current.length >= ruleFieldOptions.length) {
        return current;
      }

      const remainingField =
        ruleFieldOptions.find((option) => !current.some((condition) => condition.field === option.value))?.value ?? "region";

      return [...current, { field: remainingField, value: "" }];
    });
  };

  const removeRuleCondition = (index: number) => {
    setRuleConditions((current) => (current.length === 1 ? current : current.filter((_, conditionIndex) => conditionIndex !== index)));
  };

  const handleSelectAllVisible = () => {
    setSelectedRowIds(assignableFilteredRows.map((row) => row.id));
  };

  const handleCreateRule = () => {
    const normalizedConditions = ruleConditions.filter((condition) => condition.value.trim().length > 0);

    if (!ruleVendorId || normalizedConditions.length === 0) {
      return;
    }

    createAssignmentRule(batch.id, {
      vendorId: ruleVendorId,
      conditions: normalizedConditions,
    });
    setRuleVendorId("");
    setRuleConditions([{ field: "region", value: "" }]);
  };

  const handlePreviewAssignments = () => {
    previewAssignmentRules(batch.id);
  };

  const handleApproveAssignmentDraft = () => {
    const assignedCount = approveAssignmentDraft(batch.id);

    if (assignedCount > 0) {
      toast.success(`${assignedCount} row(s) assigned from rules.`);
      setActiveTab("assignment-groups");
      setSelectedRowIds([]);
      return;
    }

    toast.info("No eligible rows matched the current rule set.");
  };

  const handleAssign = () => {
    if (!selectedVendorId || selectedRowIds.length === 0) {
      return;
    }

    assignRowsToVendor(batch.id, selectedRowIds, selectedVendorId);
    setDispatchResultMessage(null);
    setSelectedRowIds([]);
    setActiveTab("assignment-groups");
  };

  const handleAssignGroup = (groupRows: ImportBatchRow[], vendorId: string) => {
    const rowIds = groupRows.map((r) => r.id);
    assignRowsToVendor(batch.id, rowIds, vendorId);
    toast.success(`${rowIds.length} row(s) assigned.`);
  };

  const handleDispatch = () => {
    setDispatchDialogOpen(true);
  };

  const confirmDispatch = () => {
    setDispatchDialogOpen(false);
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
    setActiveTab("import-log");
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
      setActiveTab("issue-groups");
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

  const handleBulkMapToProduct = (issueLabel: string) => {
    if (userRole !== "admin") {
      toast.info(`${issueLabel} needs Admin product mapping access.`);
      return;
    }

    navigate("/admin/products");
  };

  const handleBulkCreateProduct = (issueLabel: string) => {
    if (userRole !== "admin") {
      toast.info(`${issueLabel} needs Admin product creation access.`);
      return;
    }

    navigate("/admin/products/new");
  };

  const handleBulkExclude = (label: string, rowIds: string[]) => {
    toggleExcludedForRows(batch.id, rowIds, true);
    setSelectedRowIds((current) => current.filter((rowId) => !rowIds.includes(rowId)));
    toast.success(`${rowIds.length} row(s) excluded for ${label.toLowerCase()}.`);
  };

  const handleBulkDuplicateDecision = (label: string, rowIds: string[], decision: DuplicateDecision) => {
    markDuplicateDecisionForRows(batch.id, rowIds, decision);
    setSelectedRowIds((current) => current.filter((rowId) => !rowIds.includes(rowId)));
    toast.success(
      decision === "include"
        ? `${rowIds.length} duplicate row(s) marked import anyway.`
        : `${rowIds.length} duplicate row(s) excluded for ${label.toLowerCase()}.`,
    );
  };

  const handleExportIssueList = (label: string, rows: ImportBatchRow[]) => {
    const csvHeader = [
      "Issue type",
      "PO Number",
      "PO Line",
      "Item Code",
      "Item Name",
      "Wcode",
      "Sales Point",
      "Region",
      "Area",
      "Vendor",
      "Status",
    ];

    const csvRows = rows.map((row) => [
      label,
      row.raw.poNumber,
      row.raw.poLine,
      row.raw.itemCode,
      row.raw.itemName,
      row.raw.wcode,
      row.raw.salesPoint,
      row.raw.region,
      row.raw.area,
      row.assignment?.vendorName ?? "",
      row.status,
    ]);

    const csv = [csvHeader, ...csvRows]
      .map((line) => line.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    link.href = url;
    link.download = `${safeLabel || "issue-list"}-${batch.fileName.replace(/\.[^.]+$/, "")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} row(s) for ${label.toLowerCase()}.`);
  };

  const headerActions = (
    <Button variant="destructive" onClick={() => void handleResetQueue()}>
      <RotateCcw className="h-4 w-4" />
      Clear queue and start over
    </Button>
  );

  const assignmentProgressLabel = `${summary.assignedRows + summary.dispatchedRows + summary.excludedRows}/${summary.totalRows}`;

  return (
    <div className="flex min-h-[100dvh] overflow-x-hidden bg-slate-50">
      {sidebarOpen ? <Sidebar userRole={userRole} /> : null}

      <ContentArea className="flex flex-col">
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
                <Card className="overflow-hidden">

                  {/* ===== TAB NAVIGATION ===== */}
                  <div className="border-b border-slate-200/80 px-5 py-3 sm:px-6">
                    <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as WorkspaceTab); setSelectedRowIds([]); }}>
                      <TabsList className="w-full sm:w-auto">
                        <TabsTrigger value="issue-groups" className="px-3 sm:px-4">
                          <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                          Issue Groups
                          {tabCounts["issue-groups"] > 0 ? (
                            <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">{tabCounts["issue-groups"]}</span>
                          ) : null}
                        </TabsTrigger>
                        <TabsTrigger value="assignment-groups" className="px-3 sm:px-4">
                          <Layers className="mr-1.5 h-3.5 w-3.5" />
                          Assignment Groups
                          {tabCounts["assignment-groups"] > 0 ? (
                            <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">{tabCounts["assignment-groups"]}</span>
                          ) : null}
                        </TabsTrigger>
                        <TabsTrigger value="raw-rows" className="px-3 sm:px-4">
                          <Table2 className="mr-1.5 h-3.5 w-3.5" />
                          Raw Rows
                          <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">{tabCounts["raw-rows"]}</span>
                        </TabsTrigger>
                        <TabsTrigger value="or-preview" className="px-3 sm:px-4">
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          OR Preview
                          {tabCounts["or-preview"] > 0 ? (
                            <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">{tabCounts["or-preview"]}</span>
                          ) : null}
                        </TabsTrigger>
                        <TabsTrigger value="import-log" className="px-3 sm:px-4">
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Import Log
                          {tabCounts["import-log"] > 0 ? (
                            <span className="ml-1.5 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">{tabCounts["import-log"]}</span>
                          ) : null}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* ===== FILTER BAR (only for raw-rows + search) ===== */}
                  {(activeTab === "raw-rows" || searchTerm.trim().length > 0) ? (
                    <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative w-full max-w-2xl">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search item, PO, item code, client, or brand"
                            className="pl-9"
                          />
                        </div>
                      </div>

                      {activeTab === "raw-rows" ? (
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                          <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={availableRegions} />
                          <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={availableBrands} />
                          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={availableCategories} />
                          <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={availableVendors} />
                          <FilterSelect label="Sales Point" value={wcodeFilter} onChange={setWcodeFilter} options={availableSalesPoints} />
                          <FilterSelect label="Cycle" value={cycleFilter} onChange={setCycleFilter} options={availableCycles} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* ===== TAB CONTENT ===== */}
                  {activeTab === "issue-groups" && (
                    <IssueGroupsTab
                      batch={batch}
                      summary={summary}
                      issueSummaries={issueSummaries}
                      duplicateSummary={duplicateSummary}
                      dispatchReadiness={dispatchReadiness}
                      onBulkDuplicateDecision={handleBulkDuplicateDecision}
                      onBulkMapToProduct={handleBulkMapToProduct}
                      onBulkCreateProduct={handleBulkCreateProduct}
                      onBulkExclude={handleBulkExclude}
                      onExportIssueList={handleExportIssueList}
                    />
                  )}

                  {activeTab === "assignment-groups" && (
                    <AssignmentGroupsTab
                      batch={batch}
                      summary={summary}
                      assignmentGroups={assignmentGroups}
                      suppliers={suppliers}
                      ruleVendorId={ruleVendorId}
                      setRuleVendorId={setRuleVendorId}
                      ruleConditions={ruleConditions}
                      ruleValueOptions={ruleValueOptions}
                      ruleVendorName={ruleVendorName}
                      selectedVendorId={selectedVendorId}
                      setSelectedVendorId={setSelectedVendorId}
                      selectedVendorName={selectedVendorName}
                      selectedRowIds={selectedRowIds}
                      assignmentDraftSummary={assignmentDraftSummary}
                      assignmentPreviewEntries={assignmentPreviewEntries}
                      onAssignGroup={handleAssignGroup}
                      onCreateRule={handleCreateRule}
                      onPreviewAssignments={handlePreviewAssignments}
                      onApproveAssignmentDraft={handleApproveAssignmentDraft}
                      onAssign={handleAssign}
                      onUpdateRuleCondition={updateRuleCondition}
                      onAddRuleCondition={addRuleCondition}
                      onRemoveRuleCondition={removeRuleCondition}
                      onDeleteAssignmentRule={(ruleId) => deleteAssignmentRule(batch.id, ruleId)}
                      onMoveAssignmentRule={(ruleId, direction) => moveAssignmentRule(batch.id, ruleId, direction)}
                      onClearAssignmentDraft={clearAssignmentDraft}
                    />
                  )}

                  {activeTab === "raw-rows" && (
                    <RawRowsTab
                      batch={batch}
                      summary={summary}
                      filteredRows={filteredRows}
                      assignableFilteredRows={assignableFilteredRows}
                      selectedRowIds={selectedRowIds}
                      activeFilterCount={activeFilterCount}
                      assignmentDraftMatchMap={assignmentDraftMatchMap}
                      dispatchReadiness={dispatchReadiness}
                      canImport={canImport}
                      importPreviewEntries={importPreviewEntries}
                      dispatchResultMessage={dispatchResultMessage}
                      selectedVendorId={selectedVendorId}
                      setSelectedVendorId={setSelectedVendorId}
                      selectedVendorName={selectedVendorName}
                      suppliers={suppliers}
                      onCheckedChange={(rowId, checked) =>
                        setSelectedRowIds((current) =>
                          checked ? [...new Set([...current, rowId])] : current.filter((id) => id !== rowId),
                        )
                      }
                      onSelectAllVisible={handleSelectAllVisible}
                      onClearSelection={() => setSelectedRowIds([])}
                      onMarkDuplicateDecision={(rowId, decision) => markDuplicateDecision(batch.id, rowId, decision)}
                      onExclude={(rowId, excluded) => toggleExcluded(batch.id, rowId, excluded)}
                      onUnassign={(rowId) => unassignRows(batch.id, [rowId])}
                      onAssign={handleAssign}
                      onDispatch={handleDispatch}
                    />
                  )}

                  {activeTab === "or-preview" && (
                    <ORPreviewTab
                      batch={batch}
                      summary={summary}
                      orPreviewData={orPreviewData}
                      dispatchReadiness={dispatchReadiness}
                      canImport={canImport}
                      dispatchResultMessage={dispatchResultMessage}
                      expandedOrVendor={expandedOrVendor}
                      onSetExpandedOrVendor={setExpandedOrVendor}
                      onDispatch={handleDispatch}
                    />
                  )}

                  {activeTab === "import-log" && (
                    <ImportLogTab
                      batch={batch}
                      summary={summary}
                      onDispatch={handleDispatch}
                    />
                  )}

                  {/* ===== BOTTOM: Dispatch result message ===== */}
                  {activeTab !== "raw-rows" && activeTab !== "or-preview" && dispatchResultMessage ? (
                    <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
                        {dispatchResultMessage}
                      </div>
                    </div>
                  ) : null}
                </Card>
              </motion.section>

              {/* ===== CONTEXTUAL ACTION PANEL ===== */}
              <motion.aside
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, delay: 0.04 }}
                className="space-y-3 xl:sticky xl:top-24 xl:self-start"
              >
                {/* Side panels are now rendered inside each tab component */}
              </motion.aside>
            </section>
          </div>
        </main>
      </ContentArea>

      <Dialog open={dispatchDialogOpen} onOpenChange={setDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm dispatch</DialogTitle>
            <DialogDescription>
              This will create order requests for all eligible assigned rows in the current batch.
            </DialogDescription>
          </DialogHeader>
          {dispatchReadiness ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Dispatchable rows</span>
                <span className="font-semibold text-slate-950">{dispatchReadiness.dispatchableRows.length}</span>
              </div>
              {dispatchReadiness.pendingDuplicateRows.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pending duplicate decisions</span>
                  <span className="font-semibold text-warning">{dispatchReadiness.pendingDuplicateRows.length}</span>
                </div>
              )}
              {dispatchReadiness.unresolvedAssignedRows.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Unresolved assigned rows</span>
                  <span className="font-semibold text-warning">{dispatchReadiness.unresolvedAssignedRows.length}</span>
                </div>
              )}
              {dispatchReadiness.remainingUnassignedCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Remaining unassigned</span>
                  <span className="font-semibold text-slate-500">{dispatchReadiness.remainingUnassignedCount}</span>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDispatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmDispatch}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Dispatch now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
