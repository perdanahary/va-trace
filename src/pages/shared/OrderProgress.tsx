import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppliedFilterRow, FilterMenu } from "@/components/shared/AdvancedFilterBar";
import { OrderRequestTable, type OrderRequestTableColumn } from "@/components/domain/tables/OrderRequestTable";
import { useOrders } from "@/lib/orderStore";
import { useUserStore } from "@/lib/userStore";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { DISTRIBUTION_STATUSES, PRODUCTION_STATUSES } from "@/lib/types/v2/status";
import { buildOrderListRowsFromStoredOrders } from "@/lib/v2/compat/orderListRows";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { matchesFilterValue } from "@/components/shared/AdvancedFilterBar";

interface OrderProgressProps {
  userRole: UserRole;
}

const progressColumns: OrderRequestTableColumn[] = [
  "orderRequest",
  "clientPo",
  "project",
  "vendor",
  "salesPoints",
  "production",
  "distribution",
  "readyQuantity",
  "shippedQuantity",
  "progress",
  "pod",
  "deadline",
];

export function OrderProgress({ userRole }: OrderProgressProps) {
  const orders = useOrders();
  const { users } = useUserStore();
  const [productionOperator, setProductionOperator] = useState<"is" | "is not">("is");
  const [productionFilter, setProductionFilter] = useState<string>("all");
  const [distributionOperator, setDistributionOperator] = useState<"is" | "is not">("is");
  const [distributionFilter, setDistributionFilter] = useState<string>("all");
  const [vendorOperator, setVendorOperator] = useState<"is" | "is not">("is");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;
  const rolePrefix = `/${userRole}`;

  const vendorCompany = useMemo(() => {
    if (userRole !== "vendor") return null;
    return users.find((user) => user.role === "vendor" && user.status === "Active")?.company ?? null;
  }, [userRole, users]);

  const rows = useMemo(() => {
    const nextRows = buildOrderListRowsFromStoredOrders(orders, rolePrefix);
    if (!vendorCompany) {
      return nextRows;
    }

    const vendorSearch = vendorCompany.toLowerCase();
    return nextRows.filter((row) => row.vendorName.toLowerCase().includes(vendorSearch));
  }, [orders, rolePrefix, vendorCompany]);

  const vendorOptions = useMemo(() => Array.from(new Set(rows.map((row) => row.vendorName))).sort(), [rows]);
  const filterGroups = useMemo(
    () => [
      {
        id: "production",
        label: "Production",
        operator: productionOperator,
        value: productionFilter === "all" ? null : productionFilter,
        onValueChange: (value: string | null) => setProductionFilter(value ?? "all"),
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
        value: distributionFilter === "all" ? null : distributionFilter,
        onValueChange: (value: string | null) => setDistributionFilter(value ?? "all"),
        onOperatorChange: setDistributionOperator,
        allLabel: "All distribution",
        options: DISTRIBUTION_STATUSES.map((status) => ({
          label: formatStatusLabel(status),
          value: status,
          keywords: [status],
        })),
      },
      ...(userRole !== "vendor"
        ? [
            {
              id: "vendor",
              label: "Vendor",
              operator: vendorOperator,
              value: vendorFilter === "all" ? null : vendorFilter,
              onValueChange: (value: string | null) => setVendorFilter(value ?? "all"),
              onOperatorChange: setVendorOperator,
              allLabel: "All vendors",
              options: vendorOptions.map((vendor) => ({
                label: vendor,
                value: vendor,
                keywords: [vendor],
              })),
            },
          ]
        : []),
    ],
    [distributionFilter, productionFilter, userRole, vendorFilter, vendorOptions],
  );

  const metrics = useMemo(() => {
    const total = rows.length;
    const inProduction = rows.filter((row) => ["ACCEPTED", "PRINTING", "FINISHING", "QUALITY_CONTROL"].includes(row.productionStatus)).length;
    const ready = rows.filter((row) => row.productionStatus === "READY_FOR_DISTRIBUTION").length;
    const shipping = rows.filter((row) =>
      ["PARTIALLY_DISTRIBUTED", "FULLY_DISTRIBUTED", "PARTIALLY_RECEIVED"].includes(row.distributionStatus),
    ).length;
    const completed = rows.filter((row) => row.productionStatus === "COMPLETED" && row.distributionStatus === "FULLY_RECEIVED").length;
    const podIssues = rows.reduce((totalIssues, row) => totalIssues + row.openPodIssueCount, 0);

    return [
      { label: "Total Orders", value: total, color: "text-foreground", production: "all", distribution: "all" },
      { label: "In Production", value: inProduction, color: "text-processing", production: "PRINTING", distribution: "all" },
      { label: "Ready", value: ready, color: "text-primary", production: "READY_FOR_DISTRIBUTION", distribution: "all" },
      { label: "Shipping", value: shipping, color: "text-warning", production: "all", distribution: "PARTIALLY_DISTRIBUTED" },
      { label: "Completed", value: completed, color: "text-success", production: "COMPLETED", distribution: "FULLY_RECEIVED" },
      { label: "POD Issues", value: podIssues, color: "text-destructive", production: "all", distribution: "all" },
    ];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      if (productionFilter !== "all" && !matchesFilterValue(productionOperator, row.productionStatus, productionFilter)) return false;
      if (distributionFilter !== "all" && !matchesFilterValue(distributionOperator, row.distributionStatus, distributionFilter)) return false;
      if (vendorFilter !== "all" && !matchesFilterValue(vendorOperator, row.vendorName, vendorFilter)) return false;
      if (!query) return true;

      return [
        row.orderRequestNumber,
        row.clientPoNumber ?? "",
        row.clientName,
        row.projectName,
        row.vendorName,
        row.legacyStatusLabel ?? "",
        row.tags?.join(" ") ?? "",
        row.referenceLink?.displayTitle ?? row.referenceLink?.url ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [distributionFilter, distributionOperator, productionFilter, productionOperator, rows, searchQuery, vendorFilter, vendorOperator]);

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
  }, [distributionFilter, distributionOperator, productionFilter, productionOperator, searchQuery, vendorFilter, vendorOperator]);

  const clearFilters = () => {
    setProductionFilter("all");
    setProductionOperator("is");
    setDistributionFilter("all");
    setDistributionOperator("is");
    setVendorFilter("all");
    setVendorOperator("is");
    setSearchQuery("");
  };

  const openMetric = (metric: (typeof metrics)[number]) => {
    setProductionFilter(metric.production);
    setDistributionFilter(metric.distribution);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={`${userRole.toUpperCase()} - Order Progress Tracking`} />

        <main className="mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  productionFilter === metric.production && distributionFilter === metric.distribution
                    ? "border-primary ring-1 ring-primary"
                    : "border-border/70",
                )}
                onClick={() => openMetric(metric)}
              >
                <CardContent className="flex flex-col justify-center p-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                  <h3 className={cn("text-2xl font-bold", metric.color)}>{metric.value}</h3>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order, client PO, project, or vendor..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <FilterMenu groups={filterGroups} />
              <div className="text-sm text-muted-foreground">
                {filteredRows.length} visible of {rows.length} total
              </div>
            </div>
          </section>

          <AppliedFilterRow groups={filterGroups} onClearAll={clearFilters} />

          <section className="rounded-md border bg-card">
            <OrderRequestTable
              rows={visibleRows}
              columns={progressColumns}
              detailLabel="Open"
              emptyMessage="No order progress rows found."
              renderActions={(row: OrderListRow) => (
                <Button asChild variant="outline" size="sm">
                  <Link to={row.actionTargets.detailPath}>Open</Link>
                </Button>
              )}
            />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
              {filteredRows.length} rows
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
