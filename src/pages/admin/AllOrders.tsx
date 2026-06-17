import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Plus, Search } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { OrderRequestTable, type OrderRequestTableColumn, type SortableColumn, type SortDirection } from "@/components/domain/tables/OrderRequestTable";
import { AppliedFilterRow, FilterMenu } from "@/components/shared/AdvancedFilterBar";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DISTRIBUTION_STATUSES, PRODUCTION_STATUSES } from "@/lib/types/v2/status";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { buildDemoClaims, canWriteOrders } from "@/lib/v2/permissions";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";
import { matchesFilterValue } from "@/components/shared/AdvancedFilterBar";

interface AllOrdersProps {
  userRole?: UserRole;
}

const adminOrderColumns: OrderRequestTableColumn[] = [
  "clientPo",
  "orderRequest",
  "client",
  "project",
  "vendor",
  "created",
  "deadline",
  "production",
  "distribution",
  "progress",
  "exception",
];

const defaultHiddenColumns: OrderRequestTableColumn[] = ["client", "project", "exception"];

export function AllOrders({ userRole = "admin" }: AllOrdersProps) {
  const navigate = useNavigate();
  const rolePrefix = `/${userRole}`;
  const rows = useOrderListRows(rolePrefix);
  const writeDecision = canWriteOrders(buildDemoClaims(userRole.toUpperCase() as "ADMIN" | "OPERATOR" | "ANALYST" | "CLIENT" | "VENDOR"));
  const [searchTerm, setSearchTerm] = useState("");
  const [productionOperator, setProductionOperator] = useState<"is" | "is not">("is");
  const [selectedProductionStatus, setSelectedProductionStatus] = useState("all");
  const [distributionOperator, setDistributionOperator] = useState<"is" | "is not">("is");
  const [selectedDistributionStatus, setSelectedDistributionStatus] = useState("all");
  const [vendorOperator, setVendorOperator] = useState<"is" | "is not">("is");
  const [selectedVendor, setSelectedVendor] = useState("All Vendors");

  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<OrderRequestTableColumn[]>(
    adminOrderColumns.filter((col) => !defaultHiddenColumns.includes(col))
  );
  const [sort, setSort] = useState<{ column: SortableColumn; direction: SortDirection }>({
    column: "created",
    direction: "desc",
  });
  const createPath = userRole === "operator" ? "/operator/create" : "/admin/create";
  const pageSize = 10;

  const vendorOptions = useMemo(() => ["All Vendors", ...Array.from(new Set(rows.map((row) => row.vendorName))).sort()], [rows]);


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
      {
        id: "vendor",
        label: "Vendor",
        operator: vendorOperator,
        value: selectedVendor === "All Vendors" ? null : selectedVendor,
        onValueChange: (value: string | null) => setSelectedVendor(value ?? "All Vendors"),
        onOperatorChange: setVendorOperator,
        allLabel: "All vendors",
        options: vendorOptions.slice(1).map((vendor) => ({
          label: vendor,
          value: vendor,
          keywords: [vendor],
        })),
      },

    ],
    [distributionOperator, productionOperator, selectedDistributionStatus, selectedProductionStatus, selectedVendor, vendorOperator, vendorOptions],
  );

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.orderRequestNumber,
          row.clientPoNumber ?? "",
          row.clientName,
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
      const matchesVendor = selectedVendor === "All Vendors" || matchesFilterValue(vendorOperator, row.vendorName, selectedVendor);

      return matchesSearch && matchesProduction && matchesDistribution && matchesVendor;
    });
  }, [distributionOperator, productionOperator, rows, searchTerm, selectedDistributionStatus, selectedProductionStatus, selectedVendor, vendorOperator]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sort.column) {
        case "orderRequest":
          cmp = a.orderRequestNumber.localeCompare(b.orderRequestNumber);
          break;
        case "created":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "deadline":
          cmp = a.deadlineDate.localeCompare(b.deadlineDate);
          break;
      }
      return sort.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [filteredRows, sort]);
  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [currentPage, sortedRows]);

  const handleColumnToggle = (column: OrderRequestTableColumn) => {
    setVisibleColumns((prev) =>
      prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]
    );
  };

  const handleSortChange = (column: SortableColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [distributionOperator, productionOperator, searchTerm, selectedDistributionStatus, selectedProductionStatus, selectedVendor, vendorOperator, sort]);

  const clearFilters = () => {
    setSelectedProductionStatus("all");
    setProductionOperator("is");
    setSelectedDistributionStatus("all");
    setDistributionOperator("is");
    setSelectedVendor("All Vendors");
    setVendorOperator("is");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="All Order Requests" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order, client PO, project, vendor, or status..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterMenu groups={filterGroups} />
              <ColumnToggle
                columns={adminOrderColumns}
                visibleColumns={visibleColumns}
                onToggle={handleColumnToggle}
              />
              <Button
                onClick={() => navigate(createPath)}
                disabled={!writeDecision.allowed}
                title={writeDecision.disabledReason}
              >
                <Plus className="h-4 w-4" />
                Create New OR
              </Button>
            </div>
          </section>

          <AppliedFilterRow groups={filterGroups} onClearAll={clearFilters} />

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <OrderRequestTable
                rows={visibleRows}
                columns={visibleColumns}
                emptyMessage="No order requests found."
                renderActions={(row) => <AdminOrderActions row={row} />}
                onRowClick={(row) => navigate(row.actionTargets.detailPath)}
                sort={sort}
                onSortChange={handleSortChange}
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

function AdminOrderActions({ row }: { row: OrderListRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={row.actionTargets.detailPath}>Open details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${row.actionTargets.detailPath}/packaging-labels`}>Packaging labels</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${row.actionTargets.detailPath}/delivery-note`}>Delivery note</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
