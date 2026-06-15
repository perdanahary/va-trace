import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Play, Search } from "lucide-react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { AppliedFilterRow, FilterMenu } from "@/components/shared/AdvancedFilterBar";
import { Header } from "@/components/layout/Header";
import { OrderRequestTable, type OrderRequestTableColumn } from "@/components/domain/tables/OrderRequestTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { DISTRIBUTION_STATUSES, PRODUCTION_STATUSES } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { matchesFilterValue } from "@/components/shared/AdvancedFilterBar";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { acceptProductionJob, getProductionJobsForOrder } from "@/lib/v2/productionStore";

const vendorOrderColumns: OrderRequestTableColumn[] = [
  "clientPo",
  "orderRequest",
  "project",
  "created",
  "deadline",
  "production",
  "distribution",
  "readyQuantity",
  "shippedQuantity",
  "pod",
];

export function VendorOrders() {
  const actor = useActor("vendor", "vendor-orders");
  const rows = useOrderListRows("/vendor");

  const [searchTerm, setSearchTerm] = useState("");
  const [productionOperator, setProductionOperator] = useState<"is" | "is not">("is");
  const [selectedProductionStatus, setSelectedProductionStatus] = useState("all");
  const [distributionOperator, setDistributionOperator] = useState<"is" | "is not">("is");
  const [selectedDistributionStatus, setSelectedDistributionStatus] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
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

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
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
  }, [distributionOperator, productionOperator, rows, searchTerm, selectedDistributionStatus, selectedProductionStatus]);

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
  }, [distributionOperator, productionOperator, searchTerm, selectedDistributionStatus, selectedProductionStatus]);

  const clearFilters = () => {
    setSelectedProductionStatus("all");
    setProductionOperator("is");
    setSelectedDistributionStatus("all");
    setDistributionOperator("is");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="vendor" />
      <ContentArea>
        <Header title="My Orders" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
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
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </section>

          <AppliedFilterRow groups={filterGroups} onClearAll={clearFilters} />

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <OrderRequestTable
                rows={visibleRows}
                columns={vendorOrderColumns}
                emptyMessage="No vendor orders found."
                renderActions={(row) => <VendorOrderActions row={row} />}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}

function VendorOrderActions({ row }: { row: OrderListRow }) {
  const actor = useActor("vendor", "vendor-order-action");
  const isNotStarted = row.productionStatus === "NEW" || row.productionStatus === "SUBMITTED";

  const handleStartProduction = () => {
    const jobs = getProductionJobsForOrder(row.id);
    if (jobs.length === 0) {
      toast.error("No production jobs found for this order.");
      return;
    }
    try {
      acceptProductionJob(
        { productionJobId: jobs[0].id, expectedVersion: jobs[0].version, acceptedByUserId: actor.userId },
        buildCommand(actor, "Start production from vendor orders"),
      );
      toast.success("Production started.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  if (isNotStarted) {
    return (
      <Button size="sm" onClick={handleStartProduction}>
        <Play className="mr-1 h-3.5 w-3.5" />
        Start Production
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant={row.distributionStatus === "FULLY_RECEIVED" ? "ghost" : "outline"}>
      <Link to={row.actionTargets.detailPath}>
        {row.distributionStatus === "FULLY_RECEIVED" ? <Eye className="mr-1 h-3.5 w-3.5" /> : null}
        {row.distributionStatus === "FULLY_RECEIVED" ? "View" : "Update Progress"}
      </Link>
    </Button>
  );
}
