import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/authStore";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppliedFilterRow, FilterMenu, matchesFilterValue } from "@/components/shared/AdvancedFilterBar";
import { AllocationStatusBadge, ExceptionStateBadge, PodStatusBadge } from "@/components/domain/badges/badges";
import { DeliveryProgressBar } from "@/components/domain/DeliveryProgressBar";
import { cn } from "@/lib/utils";
import type { AllocationProgressRow } from "@/lib/types/v2/orderRequest";
import { ALLOCATION_STATUSES } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useAllocationProgressRows } from "@/lib/v2/selectors/viewModels";

interface OrderProgressProps {
  userRole: UserRole;
}

export function OrderProgress({ userRole }: OrderProgressProps) {
  const { currentUser } = useCurrentUser();
  const rolePrefix = `/${userRole}`;
  const navigate = useNavigate();

  const vendorContext = userRole === "vendor" ? currentUser?.supplierId : undefined;
  const allRows = useAllocationProgressRows(rolePrefix, vendorContext);

  const [allocationOperator, setAllocationOperator] = useState<"is" | "is not">("is");
  const [allocationFilter, setAllocationFilter] = useState<string>("all");
  const [vendorOperator, setVendorOperator] = useState<"is" | "is not">("is");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;

  const vendorOptions = useMemo(() => Array.from(new Set(allRows.map((r) => r.vendorName))).sort(), [allRows]);

  const filterGroups = useMemo(
    () => [
      {
        id: "allocation",
        label: "Status",
        operator: allocationOperator,
        value: allocationFilter === "all" ? null : allocationFilter,
        onValueChange: (value: string | null) => setAllocationFilter(value ?? "all"),
        onOperatorChange: setAllocationOperator,
        allLabel: "All statuses",
        options: ALLOCATION_STATUSES.map((status) => ({
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
              options: vendorOptions.map((v) => ({
                label: v,
                value: v,
                keywords: [v],
              })),
            },
          ]
        : []),
    ],
    [allocationFilter, allocationOperator, userRole, vendorFilter, vendorOptions],
  );

  const metrics = useMemo(() => {
    const total = allRows.length;
    const notShipped = allRows.filter((r) => r.allocationStatus === "NOT_SHIPPED").length;
    const inTransit = allRows.filter((r) =>
      ["PARTIALLY_SHIPPED", "FULLY_SHIPPED"].includes(r.allocationStatus),
    ).length;
    const partialReceive = allRows.filter((r) => r.allocationStatus === "PARTIALLY_RECEIVED").length;
    const fullyReceived = allRows.filter((r) => r.allocationStatus === "FULLY_RECEIVED").length;
    const exceptions = allRows.filter((r) => r.hasException).length;

    return [
      { label: "Total Allocations", value: total, color: "text-foreground", statusFilter: "all" },
      { label: "Not Shipped", value: notShipped, color: "text-muted-foreground", statusFilter: "NOT_SHIPPED" },
      { label: "In Transit", value: inTransit, color: "text-processing", statusFilter: "FULLY_SHIPPED" },
      { label: "Partially Received", value: partialReceive, color: "text-warning", statusFilter: "PARTIALLY_RECEIVED" },
      { label: "Fully Received", value: fullyReceived, color: "text-success", statusFilter: "FULLY_RECEIVED" },
      { label: "Exceptions", value: exceptions, color: "text-destructive", statusFilter: "EXCEPTION" },
    ];
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allRows.filter((row) => {
      if (allocationFilter !== "all" && !matchesFilterValue(allocationOperator, row.allocationStatus, allocationFilter)) return false;
      if (vendorFilter !== "all" && !matchesFilterValue(vendorOperator, row.vendorName, vendorFilter)) return false;
      if (!query) return true;

      return [row.orderRequestNumber, row.clientPoNumber ?? "", row.vendorName, row.salesPointName, row.productName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [allocationFilter, allocationOperator, allRows, searchQuery, vendorFilter, vendorOperator]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [allocationFilter, allocationOperator, searchQuery, vendorFilter, vendorOperator]);

  const clearFilters = () => {
    setAllocationFilter("all");
    setAllocationOperator("is");
    setVendorFilter("all");
    setVendorOperator("is");
    setSearchQuery("");
  };

  const openMetric = (statusFilter: string) => {
    setAllocationFilter(statusFilter);
    setAllocationOperator("is");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={`${userRole.toUpperCase()} - Order Progress Tracking`} />

        <main className="mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  allocationFilter === metric.statusFilter ? "border-primary ring-1 ring-primary" : "border-border/70",
                )}
                onClick={() => openMetric(metric.statusFilter)}
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
                placeholder="Search order, client PO, vendor, sales point, or product..."
                className="pl-9"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <FilterMenu groups={filterGroups} />
              <div className="text-sm text-muted-foreground">
                {filteredRows.length} visible of {allRows.length} total
              </div>
            </div>
          </section>

          <AppliedFilterRow groups={filterGroups} onClearAll={clearFilters} />

          <section className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Request</TableHead>
                  <TableHead>Client PO</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Sales Point</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Shipped</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>POD</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                      No allocation progress rows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => (
                    <TableRow
                      key={row.allocationId}
                      className="cursor-pointer"
                      onClick={() => navigate(row.actionTargets.orderDetailPath)}
                    >
                      <TableCell className="font-mono text-xs">{row.orderRequestNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{row.clientPoNumber ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.vendorName}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-mono">{row.salesPointCode}</span>
                          <span className="ml-1 text-muted-foreground">{row.salesPointName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-mono">{row.productCode}</span>
                          <span className="ml-1 text-muted-foreground">{row.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{row.allocatedQuantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{row.shippedQuantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{row.receivedQuantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{row.outstandingQuantity}</TableCell>
                      <TableCell>
                        <DeliveryProgressBar
                          receivedQuantity={row.receivedQuantity}
                          allocatedQuantity={row.allocatedQuantity}
                          shippedQuantity={row.shippedQuantity}
                          compact
                        />
                      </TableCell>
                      <TableCell>
                        <AllocationStatusBadge status={row.allocationStatus} />
                      </TableCell>
                      <TableCell>
                        <PodStatusBadge status={row.podStatus} />
                        {row.hasException && <ExceptionStateBadge status={row.exceptionState} className="ml-1" />}
                      </TableCell>
                      <TableCell className="text-xs">{row.deadlineDate || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
