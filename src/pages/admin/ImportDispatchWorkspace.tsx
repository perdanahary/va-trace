import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, CheckCircle2, ChevronsRight, CircleDot, FileText, Filter, Layers, ListChecks, PackageOpen, Plus, RotateCcw, Search, Send, Table2, Trash2, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { ContentArea } from "@/components/layout/ContentArea";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImportUploadPage } from "@/pages/shared/ImportUploadPage";
import {
  getDispatchReadiness,
  getImportBatchSummary,
  type DuplicateDecision,
  type ImportAssignmentRuleCondition,
  type ImportAssignmentRuleField,
  type ImportBatchRow,
  useImportStore,
} from "@/lib/importStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImportDispatchWorkspaceProps {
  role?: UserRole;
}

type WorkspaceTab = "issue-groups" | "assignment-groups" | "raw-rows" | "or-preview" | "import-log";
type RuleConditionDraft = ImportAssignmentRuleCondition;

const ruleFieldOptions: Array<{ value: ImportAssignmentRuleField; label: string }> = [
  { value: "region", label: "Region" },
  { value: "brand", label: "Brand" },
  { value: "category", label: "Category" },
  { value: "salesPoint", label: "Sales Point" },
];

function getDefaultTab(summary: ReturnType<typeof getImportBatchSummary> | null): WorkspaceTab {
  if (!summary) return "issue-groups";
  if (summary.blockerRows > 0) return "issue-groups";
  if (summary.unassignedRows > 0) return "assignment-groups";
  if (summary.assignedRows > 0) return "or-preview";
  return "import-log";
}

function getRuleFieldLabel(field: ImportAssignmentRuleField) {
  return ruleFieldOptions.find((option) => option.value === field)?.label ?? field;
}

export function ImportDispatchWorkspace({ role = "admin" }: ImportDispatchWorkspaceProps) {
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
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [ruleVendorId, setRuleVendorId] = useState("");
  const [ruleConditions, setRuleConditions] = useState<RuleConditionDraft[]>([{ field: "region", value: "" }]);
  const [dispatchResultMessage, setDispatchResultMessage] = useState<string | null>(null);
  const [expandedOrVendor, setExpandedOrVendor] = useState<string | null>(null);
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

      return matchesSearch && matchesRegion && matchesBrand && matchesCategory && matchesVendor && matchesWcode;
    });
  }, [batch, brandFilter, categoryFilter, regionFilter, activeTab, searchTerm, vendorFilter, wcodeFilter]);

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
        <Sidebar role={role} />
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
    return <ImportUploadPage role={role} />;
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
    if (role !== "admin") {
      toast.info(`${issueLabel} needs Admin product mapping access.`);
      return;
    }

    navigate("/admin/products");
  };

  const handleBulkCreateProduct = (issueLabel: string) => {
    if (role !== "admin") {
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
      {sidebarOpen ? <Sidebar role={role} /> : null}

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
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <FilterSelect label="Region" value={regionFilter} onChange={setRegionFilter} options={availableRegions} />
                          <FilterSelect label="Brand" value={brandFilter} onChange={setBrandFilter} options={availableBrands} />
                          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter} options={availableCategories} />
                          <FilterSelect label="Vendor" value={vendorFilter} onChange={setVendorFilter} options={availableVendors} />
                          <FilterSelect label="Sales Point" value={wcodeFilter} onChange={setWcodeFilter} options={availableSalesPoints} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* ===== TAB CONTENT ===== */}

                  {/* --- ISSUE GROUPS --- */}
                  {activeTab === "issue-groups" && (
                    <div className="divide-y divide-slate-200/80">
                      {duplicateSummary && duplicateSummary.rowIds.length > 0 ? (
                        <div className="bg-white px-5 py-5 sm:px-6">
                          <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">Unresolved Issues</p>
                          <Table className="min-w-full text-left">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Issue type</TableHead>
                                <TableHead>Affected rows</TableHead>
                                <TableHead>Detected value</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">{duplicateSummary.label}</TableCell>
                                <TableCell>{duplicateSummary.rowIds.length}</TableCell>
                                <TableCell>Rows with matching PO, sales point, item, and quantity</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50 hover:bg-cyan-100" onClick={() => handleBulkDuplicateDecision(duplicateSummary.label, duplicateSummary.rowIds, "include")}>Import anyway</Button>
                                    <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100" onClick={() => handleBulkDuplicateDecision(duplicateSummary.label, duplicateSummary.rowIds, "exclude")}>Exclude all matching</Button>
                                    <Button size="sm" variant="outline" onClick={() => handleExportIssueList(duplicateSummary.label, duplicateSummary.rows)}>Export issue list</Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      ) : null}

                      {issueSummaries.length > 0 ? (
                        <div className="bg-white px-5 py-5 sm:px-6">
                          {!duplicateSummary || duplicateSummary.rowIds.length === 0 ? (
                            <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">Unresolved Issues</p>
                          ) : null}
                          <Table className="min-w-full text-left mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[200px]">Issue type</TableHead>
                                <TableHead>Affected rows</TableHead>
                                <TableHead>Detected value</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {issueSummaries.map((issue) => (
                                <TableRow key={issue.key}>
                                  <TableCell className="font-medium">{issue.label}</TableCell>
                                  <TableCell>{issue.rowIds.length}</TableCell>
                                  <TableCell>{issue.rows[0]?.raw.itemCode || issue.rows[0]?.raw.itemName || "—"}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50 hover:bg-cyan-100" onClick={() => handleBulkMapToProduct(issue.label)}>Map to product</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleBulkCreateProduct(issue.label)}>Create product</Button>
                                      <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100" onClick={() => handleBulkExclude(issue.label, issue.rowIds)}>Exclude all matching</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleExportIssueList(issue.label, issue.rows)}>Export issue list</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : null}

                      {issueSummaries.length === 0 && (!duplicateSummary || duplicateSummary.rowIds.length === 0) ? (
                        <div className="px-6 py-16">
                          <EmptyTableState
                            title="No blockers found"
                            body="All rows passed validation. Proceed to vendor assignment."
                          />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* --- ASSIGNMENT GROUPS --- */}
                  {activeTab === "assignment-groups" && (
                    <div className="divide-y divide-slate-200/80">
                      {assignmentGroups.length > 0 ? (
                        <div className="bg-white px-5 py-5 sm:px-6">
                          <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
                            Assignment Groups
                            <span className="ml-2 font-normal text-slate-400">— {assignmentGroups.length} group{assignmentGroups.length === 1 ? "" : "s"} · {assignmentGroups.reduce((s, g) => s + g.rowCount, 0)} rows</span>
                          </p>
                          <Table className="min-w-full text-left mt-2">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Group</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Rows</TableHead>
                                <TableHead>Total Qty</TableHead>
                                <TableHead>Sales Points</TableHead>
                                <TableHead>Vendor Assignment</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignmentGroups.map((group) => {
                                const recommendedVendor = suppliers.find(
                                  (s) => s.status === "ACTIVE" && s.name.toLowerCase().includes(group.region.toLowerCase().slice(0, 4)),
                                );
                                const availableSuppliers = suppliers.filter((s) => s.status === "ACTIVE");

                                return (
                                  <TableRow key={group.key}>
                                    <TableCell className="font-medium">{group.label}</TableCell>
                                    <TableCell>{group.region}</TableCell>
                                    <TableCell>{group.rowCount}</TableCell>
                                    <TableCell>{group.totalQty}</TableCell>
                                    <TableCell>{group.salesPointCount}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Select onValueChange={(vendorId) => handleAssignGroup(group.rows, vendorId)}>
                                          <SelectTrigger className="w-[200px] h-8">
                                            <SelectValue placeholder={recommendedVendor ? `Recommended: ${recommendedVendor.name}` : "Select vendor..."} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableSuppliers.map((vendor) => (
                                              <SelectItem key={vendor.id} value={vendor.id}>
                                                {vendor.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="px-6 py-16">
                          <EmptyTableState
                            title="No rows need assignment"
                            body={summary.blockerRows > 0 ? "Resolve blockers first before assigning vendors." : "All rows have been assigned to vendors."}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- RAW ROWS --- */}
                  {activeTab === "raw-rows" && (
                    <>
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
                    </>
                  )}

                  {/* --- OR PREVIEW --- */}
                  {activeTab === "or-preview" && (
                    <div className="divide-y divide-slate-200/80">
                      {orPreviewData.length > 0 ? (
                        <div className="bg-white px-5 py-5 sm:px-6">
                          <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
                            OR Preview
                            <span className="ml-2 font-normal text-slate-400">— {orPreviewData.reduce((s, v) => s + v.orGroupCount, 0)} OR groups across {orPreviewData.length} vendor{orPreviewData.length === 1 ? "" : "s"}</span>
                          </p>
                          <div className="grid gap-4">
                            {orPreviewData.map((vendor) => (
                              <div key={vendor.vendorName} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Vendor</p>
                                    <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">{vendor.vendorName}</p>
                                    <div className="mt-2 flex flex-wrap gap-3">
                                      <QueueStat label="OR groups" value={vendor.orGroupCount} />
                                      <QueueStat label="Rows" value={vendor.rows.length} />
                                      <QueueStat label="Total qty" value={vendor.totalQty} />
                                      <QueueStat label="Sales points" value={vendor.salesPointCount} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3">
                                      <p className="text-xs leading-5 text-slate-500">PO: {vendor.sourcePOsList.join(", ")}</p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-3">
                                      <p className="text-xs leading-5 text-slate-500">Region: {vendor.regionsList.join(", ")}</p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExpandedOrVendor(expandedOrVendor === vendor.vendorName ? null : vendor.vendorName)}
                                    className="h-8 rounded-full px-3 text-xs"
                                  >
                                    {expandedOrVendor === vendor.vendorName ? "Hide details" : `${vendor.orGroupCount} OR groups`}
                                  </Button>
                                </div>

                                {expandedOrVendor === vendor.vendorName ? (
                                  <div className="mt-4 space-y-2">
                                    <Separator className="bg-slate-200" />
                                    <p className="mt-2 text-xs font-semibold normal-case tracking-normal text-slate-500">OR Group Detail</p>
                                    {vendor.orGroupEntries.map((orGroup) => (
                                      <div key={orGroup.key} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{orGroup.key}</p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                              {orGroup.count} rows · {orGroup.totalQty} qty
                                            </p>
                                          </div>
                                          <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-xs normal-case tracking-normal text-emerald-700">
                                            Ready
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 py-16">
                          <EmptyTableState
                            title="No ORs to preview"
                            body={summary.unassignedRows > 0 ? "Assign vendors first to generate OR preview." : "All rows have already been imported."}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- IMPORT LOG --- */}
                  {activeTab === "import-log" && (
                    <div className="divide-y divide-slate-200/80">
                      {batch.dispatchRuns.length > 0 || batch.importJob ? (
                        <div className="bg-white px-5 py-5 sm:px-6">
                          {batch.importJob ? (
                            <div className="mb-5 space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Import Job</p>
                                  <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                                    Status: <span className={cn(batch.importJob.status === "imported" ? "text-emerald-600" : batch.importJob.status === "failed" ? "text-rose-600" : "text-amber-600")}>{batch.importJob.status}</span>
                                  </p>
                                </div>
                                {batch.importJob.status === "failed" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDispatch}
                                    className="h-8 rounded-full px-3 text-xs"
                                  >
                                    <RotateCcw className="mr-1 h-3 w-3" />
                                    Retry failed
                                  </Button>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-4 gap-3">
                                <StateBlock label="Created ORs" value={String(batch.importJob.createdOrderIds.length)} />
                                <StateBlock label="Completed rows" value={String(batch.importJob.completedRowIds.length)} />
                                <StateBlock label="Failed rows" value={String(batch.importJob.failedRowIds.length)} />
                                <StateBlock label="Retries" value={String(batch.importJob.retryCount)} />
                              </div>

                              {batch.importJob.lastError ? (
                                <Alert className="rounded-xl border-rose-200 bg-rose-50 text-rose-950">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertTitle>Last error</AlertTitle>
                                  <AlertDescription>{batch.importJob.lastError}</AlertDescription>
                                </Alert>
                              ) : null}
                            </div>
                          ) : null}

                          {batch.dispatchRuns.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">
                                Dispatch Runs
                                <span className="ml-2 font-normal text-slate-400">— {batch.dispatchRuns.length} run{batch.dispatchRuns.length === 1 ? "" : "s"}</span>
                              </p>
                              {batch.dispatchRuns.map((run) => (
                                <div key={run.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Run {new Date(run.createdAt).toLocaleString()}</p>
                                      <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">{run.createdOrderIds.length} OR(s) created</p>
                                    </div>
                                    <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                                      {run.completedGroupKeys.length} groups
                                    </Badge>
                                  </div>
                                  {run.skippedExistingOrderIds.length > 0 ? (
                                    <p className="mt-2 text-xs leading-5 text-amber-600">
                                      {run.skippedExistingOrderIds.length} existing OR(s) skipped
                                    </p>
                                  ) : null}
                                  {run.createdOrderIds.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {run.createdOrderIds.map((id) => (
                                        <Badge key={id} variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-xs normal-case tracking-normal text-emerald-700">
                                          {id}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {!batch.importJob && batch.dispatchRuns.length === 0 ? (
                            <EmptyTableState
                              title="No import activity yet"
                              body="Run an import to see the log here."
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div className="px-6 py-16">
                          <EmptyTableState
                            title="No import activity yet"
                            body="Run an import to see the log here."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== BOTTOM: Dispatch result message ===== */}
                  {dispatchResultMessage ? (
                    <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">
                      <Alert className="rounded-xl border-cyan-200 bg-cyan-50 text-cyan-950">
                        <AlertTitle>Import result</AlertTitle>
                        <AlertDescription>{dispatchResultMessage}</AlertDescription>
                      </Alert>
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
                {/* --- ISSUE GROUPS PANEL --- */}
                {activeTab === "issue-groups" && (
                  <Card>
                    <CardContent className="p-5">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Flow progress</p>
                        <div className="space-y-1.5">
                          <FlowProgressRow label="Imported" value={summary.totalRows} active={false} complete={false} />
                          <FlowProgressRow label="Blocked" value={summary.blockerRows} active={summary.blockerRows > 0} complete={summary.blockerRows === 0} />
                          <FlowProgressRow label="Assignable" value={summary.totalRows - summary.blockerRows - summary.dispatchedRows - summary.excludedRows} active={summary.blockerRows === 0 && summary.unassignedRows > 0} complete={summary.unassignedRows === 0} />
                          <FlowProgressRow label="Ready" value={dispatchReadiness?.dispatchableRows.length ?? 0} active={(dispatchReadiness?.dispatchableRows.length ?? 0) > 0} complete={(dispatchReadiness?.dispatchableRows.length ?? 0) === 0 && summary.dispatchedRows > 0} />
                          <FlowProgressRow label="Imported ✓" value={summary.dispatchedRows} active={false} complete={summary.dispatchedRows > 0} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* --- ASSIGNMENT GROUPS PANEL --- */}
                {activeTab === "assignment-groups" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Vendor Assignment</CardDescription>
                      <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Assign vendor to group</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        Build batch rules from row attributes, preview the coverage, then approve the draft assignment once.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule builder</p>
                            <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                              Assign by region, brand, category, or sales point
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                            {batch.assignmentRules.length} rule{batch.assignmentRules.length === 1 ? "" : "s"}
                          </Badge>
                        </div>

                        {ruleConditions.map((condition, index) => {
                          const usedFields = ruleConditions.map((entry) => entry.field);
                          const fieldOptions = ruleFieldOptions.filter(
                            (option) => option.value === condition.field || !usedFields.includes(option.value),
                          );

                          return (
                            <div key={`${condition.field}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3">
                              <div className="grid gap-2 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto]">
                                <Select value={condition.field} onValueChange={(value) => updateRuleCondition(index, { field: value as ImportAssignmentRuleField })}>
                                  <SelectTrigger aria-label={`Rule field ${index + 1}`} className="h-10 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fieldOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value} className="normal-case tracking-normal">
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Select value={condition.value} onValueChange={(value) => updateRuleCondition(index, { value })}>
                                  <SelectTrigger aria-label={`Rule value ${index + 1}`} className="h-10 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                                    <SelectValue placeholder="Select value" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(ruleValueOptions[condition.field] ?? []).map((option) => (
                                      <SelectItem key={option} value={option} className="normal-case tracking-normal">
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={ruleConditions.length === 1}
                                  onClick={() => removeRuleCondition(index)}
                                  className="h-10 w-10 text-slate-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={addRuleCondition}
                          disabled={ruleConditions.length >= ruleFieldOptions.length}
                          className="h-10 border-dashed border-slate-300 bg-white"
                        >
                          <Plus className="h-4 w-4" />
                          Add condition
                        </Button>

                        <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
                          Assign to vendor
                          <Select value={ruleVendorId} onValueChange={setRuleVendorId}>
                            <SelectTrigger aria-label="Rule vendor" className="h-11 rounded-xl border-slate-200 bg-white normal-case tracking-normal">
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
                          type="button"
                          onClick={handleCreateRule}
                          disabled={!ruleVendorId || ruleConditions.every((condition) => condition.value.trim().length === 0)}
                          className="h-11 bg-slate-950 text-white hover:bg-slate-900"
                        >
                          Create assignment rule
                          <Plus className="h-3.5 w-3.5" />
                        </Button>

                        {ruleVendorName ? (
                          <p className="text-xs leading-5 text-slate-500">
                            New rule will assign to <span className="font-semibold text-slate-700">{ruleVendorName}</span>.
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule priority</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePreviewAssignments}
                            disabled={batch.assignmentRules.length === 0}
                            className="h-8 px-3 text-xs"
                          >
                            <Wand2 className="h-3.5 w-3.5" />
                            Preview draft
                          </Button>
                        </div>
                        {batch.assignmentRules.length === 0 ? (
                          <p className="text-xs leading-5 text-slate-500">No rules yet. Add a rule to start drafting assignment coverage for this batch.</p>
                        ) : (
                          <div className="space-y-2">
                            {batch.assignmentRules.map((rule, index) => (
                              <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Priority {index + 1}</p>
                                    <p className="mt-1 truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">{rule.vendorName}</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                      {rule.conditions.map((condition) => `${getRuleFieldLabel(condition.field)} = ${condition.value}`).join(" · ")}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      disabled={index === 0}
                                      onClick={() => moveAssignmentRule(batch.id, rule.id, "up")}
                                      className="h-8 w-8 text-slate-500"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      disabled={index === batch.assignmentRules.length - 1}
                                      onClick={() => moveAssignmentRule(batch.id, rule.id, "down")}
                                      className="h-8 w-8 text-slate-500"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteAssignmentRule(batch.id, rule.id)}
                                      className="h-8 w-8 text-slate-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Draft review</p>
                            <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                              {assignmentDraftSummary.matchedCount} row(s) matched by rules
                            </p>
                          </div>
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                            {batch.assignmentDraft ? "Preview ready" : "Not generated"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <StateBlock label="Matched" value={String(assignmentDraftSummary.matchedCount)} />
                          <StateBlock label="Left open" value={String(assignmentDraftSummary.unmatchedCount)} />
                          <StateBlock label="Blocked" value={String(assignmentDraftSummary.blockedCount)} />
                        </div>

                        {batch.assignmentDraft ? (
                          <>
                            <div className="space-y-2">
                              {assignmentDraftSummary.ruleCounts.map((entry, index) => (
                                <div key={entry.ruleId} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule {index + 1}</p>
                                    <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">{entry.vendorName}</p>
                                    <p className="text-xs leading-5 text-slate-500">{entry.summary}</p>
                                  </div>
                                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs normal-case tracking-normal text-slate-600">
                                    {entry.count} rows
                                  </Badge>
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => clearAssignmentDraft(batch.id)}
                                className="h-11 border-slate-200 bg-white"
                              >
                                Clear draft
                              </Button>
                              <Button
                                type="button"
                                onClick={handleApproveAssignmentDraft}
                                disabled={assignmentDraftSummary.matchedCount === 0}
                                className="h-11 bg-slate-950 text-white hover:bg-slate-900"
                              >
                                Approve draft assignments
                                <ChevronsRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs leading-5 text-slate-500">
                            Generate a preview to see how many unassigned rows each rule will capture before anything is committed.
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
                          <span>Manual override</span>
                          <span>{selectedRowIds.length} selected</span>
                        </div>
                        <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
                          Vendor: {selectedVendorName ?? "Not selected"}
                        </p>
                        <p className="text-xs leading-5 text-slate-500">
                          Use this only for exceptions after the rule draft has covered the bulk of the batch.
                        </p>

                        <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
                          Assign vendor
                          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                            <SelectTrigger aria-label="Manual vendor" className="h-11 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
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
                          className="h-11 w-full bg-slate-950 text-white hover:bg-slate-900"
                        >
                          Assign selected rows
                          <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Manual assignment preview</p>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                              {assignmentPreviewEntries.length} group{assignmentPreviewEntries.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          {assignmentPreviewEntries.length === 0 ? (
                            <p className="text-xs leading-5 text-slate-500">Select assignable rows and a vendor to preview the OR groups that selection will feed.</p>
                          ) : (
                            <PreviewGroupList entries={assignmentPreviewEntries} />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* --- RAW ROWS PANEL --- */}
                {activeTab === "raw-rows" && (
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

                        <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
                          Assign vendor
                          <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                            <SelectTrigger aria-label="Manual vendor" className="h-11 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
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
                          className="h-11 w-full bg-slate-950 text-white hover:bg-slate-900"
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
                          <Alert className="rounded-xl border-cyan-200 bg-cyan-50 text-cyan-950">
                            <AlertTitle>Import result</AlertTitle>
                            <AlertDescription>{dispatchResultMessage}</AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* --- OR PREVIEW PANEL --- */}
                {activeTab === "or-preview" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Import Summary</CardDescription>
                      <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Ready to create ORs</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        {orPreviewData.reduce((s, v) => s + v.orGroupCount, 0)} ORs will be created · {dispatchReadiness?.dispatchableRows.length ?? 0} rows included
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <StateBlock label="ORs to create" value={String(orPreviewData.reduce((s, v) => s + v.orGroupCount, 0))} />
                        <StateBlock label="Vendors" value={String(orPreviewData.length)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StateBlock label="Total rows" value={String(dispatchReadiness?.dispatchableRows.length ?? 0)} />
                        <StateBlock label="Total qty" value={String(orPreviewData.reduce((s, v) => s + v.totalQty, 0))} />
                      </div>

                      {orPreviewData.length > 0 ? (
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                          {orPreviewData.map((v) => (
                            <div key={v.vendorName} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold tracking-[-0.02em] text-slate-950">{v.vendorName}</p>
                                <p className="text-xs leading-5 text-slate-500">{v.rows.length} rows · {v.totalQty} qty</p>
                              </div>
                              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs normal-case tracking-normal text-slate-600">
                                {v.orGroupCount} ORs
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-2 text-xs leading-5 text-slate-600">
                        {summary.blockerRows > 0 ? (
                          <p className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" />
                            {summary.blockerRows} blocker(s) must be resolved before import.
                          </p>
                        ) : null}
                        {summary.unassignedRows > 0 ? (
                          <p className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-cyan-600" />
                            {summary.unassignedRows} row(s) are unassigned and will remain in the queue for later.
                          </p>
                        ) : null}
                        {(dispatchReadiness?.dispatchableRows.length ?? 0) > 0 && summary.blockerRows === 0 ? (
                          <p className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                            Ready to create ORs for assigned rows.
                          </p>
                        ) : null}
                      </div>

                      <Button
                        onClick={handleDispatch}
                        disabled={!canImport}
                        className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-900"
                      >
                        {batch.importJob?.status === "failed" ? "Retry import ORs" : "Create Order Requests"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>

                      {dispatchResultMessage ? (
                        <Alert className="rounded-xl border-cyan-200 bg-cyan-50 text-cyan-950">
                          <AlertTitle>Import result</AlertTitle>
                          <AlertDescription>{dispatchResultMessage}</AlertDescription>
                        </Alert>
                      ) : null}
                    </CardContent>
                  </Card>
                )}

                {/* --- IMPORT LOG PANEL --- */}
                {activeTab === "import-log" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Import Log</CardDescription>
                      <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Import activity summary</CardTitle>
                      <CardDescription className="text-sm leading-6 text-slate-600">
                        Track the results of import runs and retry failed operations if needed.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <StateBlock label="Total ORs created" value={String(batch.dispatchRuns.reduce((s, r) => s + r.createdOrderIds.length, 0))} />
                        <StateBlock label="Total runs" value={String(batch.dispatchRuns.length)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StateBlock label="Imported rows" value={String(summary.dispatchedRows)} />
                        <StateBlock label="Skipped ORs" value={String(batch.dispatchRuns.reduce((s, r) => s + r.skippedExistingOrderIds.length, 0))} />
                      </div>

                      {batch.importJob?.status === "failed" ? (
                        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                          <p className="text-xs font-semibold normal-case tracking-normal text-rose-800">Last import failed</p>
                          <p className="text-xs leading-5 text-rose-700">{batch.importJob.lastError || "Unknown error"}</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDispatch}
                            className="mt-2 h-8 rounded-full border-rose-200 bg-white px-3 text-xs text-rose-700 hover:bg-rose-100"
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Retry failed import
                          </Button>
                        </div>
                      ) : null}

                      {summary.totalRows > 0 && summary.dispatchedRows === summary.totalRows ? (
                        <div className="flex items-center gap-3 rounded-xl border-emerald-200 bg-emerald-50 p-3.5">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="text-xs font-semibold normal-case tracking-normal text-emerald-800">Batch fully imported</p>
                            <p className="text-xs leading-5 text-emerald-700">All {summary.totalRows} rows have been processed.</p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}
              </motion.aside>
            </section>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}

function toIssueLabel(issue: string) {
  if (issue.toLowerCase() === "item code not found in product master") {
    return "Item code not found";
  }

  return issue;
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
    <div className={cn("rounded-xl border px-3 py-2.5 transition-colors hover:border-slate-300", classes)}>
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
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm",
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

function StateBlock({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : "border-slate-200/80 bg-slate-50",
    )}>
      <p className={cn(
        "text-xs font-semibold normal-case tracking-normal",
        tone === "success" ? "text-emerald-700" : "text-slate-500",
      )}>{label}</p>
      <p className={cn(
        "mt-2 text-lg font-semibold tracking-[-0.03em]",
        tone === "success" ? "text-emerald-800" : "text-slate-950",
      )}>{value}</p>
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
  const comboboxOptions = useMemo(() => options.map((opt) => ({ value: opt, label: opt })), [options]);

  return (
    <label className="grid gap-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
      {label}
      <SearchableCombobox
        value={value}
        onValueChange={onChange}
        options={comboboxOptions}
        placeholder={`Select ${label.toLowerCase()}...`}
        className="h-11 bg-white"
      />
    </label>
  );
}

function EmptyTableState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
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

function IssueActionCard({
  issueType,
  affectedRows,
  detectedValue,
  actions,
}: {
  issueType: string;
  affectedRows: number;
  detectedValue?: string;
  actions: Array<{
    label: string;
    tone: "primary" | "danger" | "neutral";
    onClick: () => void;
  }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div>
            <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Issue type</p>
            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">{issueType}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Affected rows</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{affectedRows.toLocaleString()}</p>
          </div>
          {detectedValue ? (
            <div>
              <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Detected value</p>
              <p className="mt-1 max-w-[300px] truncate text-sm font-medium text-slate-800">{detectedValue}</p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 lg:max-w-[70%]">
          <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Suggested action</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action) => (
              <MiniAction key={action.label} label={action.label} tone={action.tone} onClick={action.onClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignmentGroupCard({
  label,
  rowCount,
  totalQty,
  salesPointCount,
  region,
  recommendedVendorName,
  suppliers,
  onAssign,
}: {
  label: string;
  rowCount: number;
  totalQty: number;
  salesPointCount: number;
  region: string;
  recommendedVendorName: string | null;
  suppliers: Array<{ id: string; name: string }>;
  onAssign: (vendorId: string) => void;
}) {
  const [selectedVendor, setSelectedVendor] = useState("");

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Group</p>
            <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">{label}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <QueueStat label="Rows" value={rowCount} />
            <QueueStat label="Total qty" value={totalQty} />
            <QueueStat label="Sales points" value={salesPointCount} />
          </div>
          <p className="text-xs leading-5 text-slate-500">Region: {region}</p>
        </div>

        <div className="min-w-0 space-y-2 lg:max-w-[50%]">
          {recommendedVendorName ? (
            <div>
              <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Recommended vendor</p>
              <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">{recommendedVendorName}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger aria-label="Assign vendor" className="h-9 w-[180px] rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal">
                <SelectValue placeholder="Choose vendor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="normal-case tracking-normal">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!selectedVendor}
              onClick={() => onAssign(selectedVendor)}
              className="h-9 rounded-full bg-slate-950 px-4 text-xs font-semibold normal-case tracking-normal text-white hover:bg-slate-900"
            >
              Assign
            </Button>
          </div>
          {recommendedVendorName ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const v = suppliers.find((s) => s.name === recommendedVendorName);
                if (v) onAssign(v.id);
              }}
              className="h-8 rounded-full border-cyan-200 bg-cyan-50 px-3 text-xs text-cyan-800 hover:bg-cyan-100"
            >
              Assign {recommendedVendorName}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FlowProgressRow({ label, value, active, complete }: { label: string; value: number; active: boolean; complete: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-xs",
      active ? "bg-cyan-50 text-cyan-800" : complete ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-500",
    )}>
      <div className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        active ? "bg-cyan-200" : complete ? "bg-emerald-200" : "bg-slate-200",
      )}>
        {complete ? <CheckCircle2 className="h-3 w-3" /> : <ArrowRight className={cn("h-3 w-3", active ? "text-cyan-700" : "text-slate-400")} />}
      </div>
      <span className="font-semibold">{label}</span>
      <span className="ml-auto font-mono tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
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
