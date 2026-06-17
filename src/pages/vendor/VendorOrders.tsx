import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { AppliedFilterRow, FilterMenu } from "@/components/shared/AdvancedFilterBar";
import { Header } from "@/components/layout/Header";
import { OrderRequestTable, type OrderRequestTableColumn } from "@/components/domain/tables/OrderRequestTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { DISTRIBUTION_STATUSES, PRODUCTION_STATUSES } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { matchesFilterValue } from "@/components/shared/AdvancedFilterBar";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { acceptProductionJob, getProductionJobsForOrder } from "@/lib/v2/productionStore";
import { useCurrentUser } from "@/lib/authStore";
import type { SortDirection, SortableColumn } from "@/components/domain/tables/OrderRequestTable";

const vendorOrderColumns: OrderRequestTableColumn[] = [
  "orderRequest",
  "clientPo",
  "project",
  "created",
  "deadline",
  "production",
  "distribution",
  "progress",
];

const TAB_FILTERS = {
  all: () => true,
  "needs-confirmation": (row: OrderListRow) => row.productionStatus === "SUBMITTED",
  "in-production": (row: OrderListRow) =>
    ["ACCEPTED", "IN_PROGRESS"].includes(row.productionStatus),
  shipping: (row: OrderListRow) =>
    row.productionStatus === "COMPLETED" ||
    (row.distributionStatus != null && row.distributionStatus !== "NOT_STARTED" && row.distributionStatus !== "FULLY_RECEIVED"),
  history: (row: OrderListRow) => row.distributionStatus === "FULLY_RECEIVED",
} as const satisfies Record<string, (row: OrderListRow) => boolean>;

type TabId = keyof typeof TAB_FILTERS;

export function VendorOrders() {
  const actor = useActor("vendor", "vendor-orders");
  const { currentUser } = useCurrentUser();
  const rows = useOrderListRows("/vendor");

  const userRole = currentUser?.role?.toLowerCase() ?? "vendor";

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [productionOperator, setProductionOperator] = useState<"is" | "is not">("is");
  const [selectedProductionStatus, setSelectedProductionStatus] = useState("all");
  const [distributionOperator, setDistributionOperator] = useState<"is" | "is not">("is");
  const [selectedDistributionStatus, setSelectedDistributionStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<{ column: SortableColumn; direction: SortDirection }>({ column: "created", direction: "desc" });
  const pageSize = 10;

  const filterGroups = useMemo(
    () => [
      {
        id: "production",
        label: "Production",
        operator: productionOperator,
        value: selectedProductionStatus === "all" ? null : selectedProductionStatus,
        onValueChange: (value: string | null) => setSelectedProductionStatus(value ?? "all"),
        onOperatorChange: setProductionOperator,
        allLabel: "All production",
        options: PRODUCTION_STATUSES.map((status) => ({
          label: formatStatusLabel(status),
          value: status,
          keywords: [status],
        })),
      },
      {
        id: "distribution",
        label: "Distribution",
        operator: distributionOperator,
        value: selectedDistributionStatus === "all" ? null : selectedDistributionStatus,
        onValueChange: (value: string | null) => setSelectedDistributionStatus(value ?? "all"),
        onOperatorChange: setDistributionOperator,
        allLabel: "All distribution",
        options: DISTRIBUTION_STATUSES.map((status) => ({
          label: formatStatusLabel(status),
          value: status,
          keywords: [status],
        })),
      },
    ],
    [selectedDistributionStatus, selectedProductionStatus],
  );

  const tabFiltered = useMemo(() => {
    const filterFn = TAB_FILTERS[activeTab];
    return activeTab === "all" ? rows : rows.filter(filterFn);
  }, [activeTab, rows]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const matched = tabFiltered.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.orderRequestNumber,
          row.clientPoNumber ?? "",
          row.projectName,
          row.vendorName,
          row.deadlineDate,
          row.legacyStatusLabel ?? "",
          row.tags?.join(" ") ?? "",
          row.referenceLink?.displayTitle ?? row.referenceLink?.url ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesProduction =
        selectedProductionStatus === "all" || matchesFilterValue(productionOperator, row.productionStatus, selectedProductionStatus);
      const matchesDistribution =
        selectedDistributionStatus === "all" || matchesFilterValue(distributionOperator, row.distributionStatus, selectedDistributionStatus);

      return matchesSearch && matchesProduction && matchesDistribution;
    });

    matched.sort((a, b) => {
      const dir = sortState.direction === "asc" ? 1 : -1;
      switch (sortState.column) {
        case "created":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        case "deadline":
          return (new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime()) * dir;
        case "orderRequest":
          return a.orderRequestNumber.localeCompare(b.orderRequestNumber) * dir;
        default:
          return 0;
      }
    });

    return matched;
  }, [distributionOperator, productionOperator, tabFiltered, searchTerm, selectedDistributionStatus, selectedProductionStatus, sortState]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, distributionOperator, productionOperator, searchTerm, selectedDistributionStatus, selectedProductionStatus]);

  const handleSortChange = (column: SortableColumn) => {
    setSortState((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc",
    }));
  };

  const clearFilters = () => {
    setSelectedProductionStatus("all");
    setProductionOperator("is");
    setSelectedDistributionStatus("all");
    setDistributionOperator("is");
    setSearchTerm("");
  };

  const handleConfirmOrder = async (row: OrderListRow) => {
    if (row.productionStatus !== "SUBMITTED") return;

    const jobs = getProductionJobsForOrder(row.id);
    if (jobs.length === 0) {
      toast.error("No production jobs found for this order.");
      return;
    }
    try {
      acceptProductionJob(
        { productionJobId: jobs[0].id, expectedVersion: jobs[0].version, acceptedByUserId: actor.userId },
        buildCommand(actor, "Confirm order from vendor orders"),
      );
      toast.success("Order confirmed. Production can now begin.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  const handleRowClick = (row: OrderListRow) => {
    window.location.href = `/vendor/orders/${row.id}`;
  };

  const submittedCount = filteredRows.filter((r) => r.productionStatus === "SUBMITTED").length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="vendor" />
      <ContentArea>
        <Header title="My Orders" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          {submittedCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="text-sm font-medium text-primary">
                You have{" "}
                <strong>{submittedCount} order{submittedCount > 1 ? "s" : ""}</strong>{" "}
                waiting for confirmation.
              </p>
              <Button
                variant="link"
                size="sm"
                className="ml-auto h-auto p-0 text-primary"
                onClick={() => setActiveTab("needs-confirmation")}
              >
                Show orders &darr;
              </Button>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabId)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="needs-confirmation">Needs Confirmation</TabsTrigger>
              <TabsTrigger value="in-production">In Production</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </Tabs>

          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order, client PO, project, or status..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterMenu groups={filterGroups} />
            </div>
          </section>

          <AppliedFilterRow groups={filterGroups} onClearAll={clearFilters} />

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <OrderRequestTable
                rows={visibleRows}
                columns={vendorOrderColumns}
                emptyMessage="No vendor orders found."
                renderActions={(row) => renderOrderAction(row, userRole, handleConfirmOrder)}
                onRowClick={handleRowClick}
                sort={sortState}
                onSortChange={handleSortChange}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                  Previous
                </Button>
                <Button variant="outline" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}

function renderOrderAction(
  row: OrderListRow,
  userRole: string,
  onConfirmOrder: (row: OrderListRow) => void,
) {
  const status = row.productionStatus;

  if (status === "NEW") {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        Awaiting Job
      </Badge>
    );
  }

  if (status === "SUBMITTED") {
    return (
      <Button size="sm" onClick={(e) => { e.stopPropagation(); onConfirmOrder(row); }}>
        Confirm Order
      </Button>
    );
  }

  if (
    ["ACCEPTED", "IN_PROGRESS"].includes(status) ||
    (row.distributionStatus && row.distributionStatus !== "FULLY_RECEIVED")
  ) {
    return (
      <Button size="sm" variant="outline" asChild>
        <a href={`/${userRole}/orders/${row.id}`}>Update Progress</a>
      </Button>
    );
  }

  return (
    <Button size="sm" variant="ghost" asChild>
      <a href={`/${userRole}/orders/${row.id}`}>View</a>
    </Button>
  );
}
