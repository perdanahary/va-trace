import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpRight, ChevronsUpDown, Eye } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductionStatusBadge, DistributionStatusBadge } from "@/components/domain/badges/badges";
import { cn } from "@/lib/utils";
import { useOrderRequests } from "@/lib/v2/orderRequestStore";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import { acceptProductionJob, getProductionJobsForOrder } from "@/lib/v2/productionStore";

type VendorTab = "Pending" | "Production" | "Shipping" | "History";
type SortColumn = "created" | "deadline" | "orderRequest";
type SortDirection = "asc" | "desc";

export function VendorDashboard() {
  const actor = useActor("vendor", "vendor-dashboard");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VendorTab>("Production");
  const [sortState, setSortState] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "created", direction: "desc" });
  const orders = useOrderRequests();
  const rows = useOrderListRows("/vendor");

  const submittedCount = orders.filter((o) => o.productionStatus === "SUBMITTED").length;

  const metrics = useMemo(() => {
    const pending = orders.filter((o) => o.productionStatus === "NEW" || o.productionStatus === "SUBMITTED").length;
    const inProduction = orders.filter((o) =>
      ["ACCEPTED", "PRINTING", "FINISHING", "QUALITY_CONTROL"].includes(o.productionStatus),
    ).length;
    const ready = orders.filter((o) => o.productionStatus === "READY_FOR_DISTRIBUTION" || o.productionStatus === "COMPLETED").length;
    const shipping = orders.filter((o) =>
      ["PARTIALLY_DISTRIBUTED", "FULLY_DISTRIBUTED", "PARTIALLY_RECEIVED"].includes(o.distributionStatus),
    ).length;
    const completed = orders.filter((o) => o.productionStatus === "COMPLETED" && o.distributionStatus === "FULLY_RECEIVED").length;

    return [
      { label: "Pending", value: String(pending).padStart(2, "0"), change: "Needs your confirmation", color: "text-warning" },
      { label: "In Production", value: String(inProduction).padStart(2, "0"), change: "In progress", color: "text-primary" },
      { label: "Ready", value: String(ready).padStart(2, "0"), change: "Ready to dispatch", color: "text-processing" },
      { label: "Shipping", value: String(shipping).padStart(2, "0"), change: "On delivery", color: "text-processing" },
      { label: "Completed", value: String(completed).padStart(2, "0"), change: "Last 30 days", color: "text-success" },
    ];
  }, [orders]);

  const sortOrders = useMemo(() => {
    return (list: OrderListRow[]) => {
      const sorted = [...list];
      sorted.sort((a, b) => {
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
      return sorted;
    };
  }, [sortState]);

  const pendingOrders = useMemo(() => sortOrders(getOrdersForTab("Pending", rows)), [rows, sortOrders]);
  const productionOrders = useMemo(() => sortOrders(getOrdersForTab("Production", rows)), [rows, sortOrders]);
  const shippingOrders = useMemo(() => sortOrders(getOrdersForTab("Shipping", rows)), [rows, sortOrders]);
  const historyOrders = useMemo(() => sortOrders(getOrdersForTab("History", rows)), [rows, sortOrders]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="vendor" />
      <ContentArea>
        <Header title="Vendor Dashboard" />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {metrics.map((metric, index) => (
              <Card key={metric.label} className="group border-border/70 shadow-sm transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardDescription>{metric.label}</CardDescription>
                    <CardTitle className={`text-3xl ${metric.color}`}>{metric.value}</CardTitle>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <p className="text-xs text-muted-foreground">{metric.change}</p>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                    #{String(index + 1).padStart(2, "0")}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </section>

          {submittedCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-5 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="text-sm font-medium text-primary">
                You have <strong>{submittedCount} order{submittedCount > 1 ? "s" : ""}</strong>{" "}
                waiting for your confirmation.
              </p>
              <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-primary"
                onClick={() => navigate(`/vendor/orders`)}>
                View orders →
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VendorTab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Production">In Production</TabsTrigger>
              <TabsTrigger value="Shipping">Shipping</TabsTrigger>
              <TabsTrigger value="History">History</TabsTrigger>
            </TabsList>

              <TabsContent value="Pending">
                <VendorOrderTable orders={pendingOrders} tab="Pending" sort={sortState} onSortChange={(col) => setSortState((prev) => ({ column: col, direction: prev.column === col && prev.direction === "desc" ? "asc" : "desc" }))} />
              </TabsContent>
              <TabsContent value="Production">
                <VendorOrderTable orders={productionOrders} tab="Production" sort={sortState} onSortChange={(col) => setSortState((prev) => ({ column: col, direction: prev.column === col && prev.direction === "desc" ? "asc" : "desc" }))} />
              </TabsContent>
              <TabsContent value="Shipping">
                <VendorOrderTable orders={shippingOrders} tab="Shipping" sort={sortState} onSortChange={(col) => setSortState((prev) => ({ column: col, direction: prev.column === col && prev.direction === "desc" ? "asc" : "desc" }))} />
              </TabsContent>
              <TabsContent value="History">
                <VendorOrderTable orders={historyOrders} tab="History" sort={sortState} onSortChange={(col) => setSortState((prev) => ({ column: col, direction: prev.column === col && prev.direction === "desc" ? "asc" : "desc" }))} />
              </TabsContent>
          </Tabs>
        </main>
      </ContentArea>
    </div>
  );
}

function VendorOrderTable({ orders, tab, sort, onSortChange }: { orders: OrderListRow[]; tab: VendorTab; sort: { column: SortColumn; direction: SortDirection }; onSortChange: (column: SortColumn) => void }) {
  const actor = useActor("vendor", "vendor-order-table");

  const handleConfirmOrder = async (orderId: string) => {
    const jobs = getProductionJobsForOrder(orderId);
    if (jobs.length === 0) {
      toast.error("No production jobs found for this order.");
      return;
    }
    try {
      acceptProductionJob(
        { productionJobId: jobs[0].id, expectedVersion: jobs[0].version, acceptedByUserId: actor.userId },
        buildCommand(actor, "Start production from vendor dashboard"),
      );
      toast.success("Order confirmed. Production can now begin.");
    } catch (error) {
      toast.error(toApiError(error).message);
    }
  };

  if (orders.length === 0) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mx-auto max-w-sm space-y-2 text-center">
            <p className="text-sm font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground">
              {tab === "Pending"
                ? "No orders awaiting confirmation."
                : tab === "Production"
                  ? "No orders in production."
                  : tab === "Shipping"
                    ? "No orders in shipping."
                    : "No completed orders."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 py-0 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="orderRequest" label="Order ID" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Production Status</TableHead>
              <TableHead>Distribution Status</TableHead>
              <TableHead>Delivery Progress</TableHead>
              <TableHead>
                <SortButton column="created" label="Created" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead>
                <SortButton column="deadline" label="Deadline" sort={sort} onSortChange={onSortChange} />
              </TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((row) => {
              const deadlineInfo = getDeadlineInfo(row.deadlineDate, row.createdAt);
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => window.location.href = `/vendor/orders/${row.id}`}
                >
                  <TableCell className="font-mono text-xs font-medium">{row.orderRequestNumber}</TableCell>
                  <TableCell className="max-w-[260px] text-sm">
                    <div className="truncate">{row.projectName}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <ProductionStatusBadge status={row.productionStatus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <DistributionStatusBadge status={row.distributionStatus} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <span className="font-medium text-foreground">{row.deliveryProgressPercent}%</span>
                    <span className="ml-1 text-muted-foreground">
                      ({row.deliveryProgressLabel})
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCreatedDate(row.createdAt)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-sm",
                      deadlineInfo.isOverdue
                        ? "font-semibold text-destructive"
                        : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3
                          ? "font-semibold text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {!deadlineInfo.isOverdue && deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      )}
                      {deadlineInfo.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.orderedQuantity}</TableCell>
                  <TableCell className="text-right">
                    {tab === "Pending" && (
                      row.productionStatus === "NEW" ? (
                        <Badge variant="secondary" className="text-xs font-normal">Awaiting Job</Badge>
                      ) : row.productionStatus === "SUBMITTED" ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleConfirmOrder(row.id); }}>
                          Confirm Order
                        </Button>
                      ) : null
                    )}
                    {(tab === "Production" || tab === "Shipping") && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/vendor/update/${row.id}`}>Update Progress</Link>
                      </Button>
                    )}
                    {tab === "History" && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/vendor/update/${row.id}`}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getOrdersForTab(tab: VendorTab, orders: OrderListRow[]) {
  switch (tab) {
    case "Pending":
      return orders.filter((order) => order.productionStatus === "NEW" || order.productionStatus === "SUBMITTED");
    case "Production":
      return orders.filter((order) => ["ACCEPTED", "PRINTING", "FINISHING", "QUALITY_CONTROL"].includes(order.productionStatus));
    case "Shipping":
      return orders.filter((order) =>
        ["READY_FOR_DISTRIBUTION", "COMPLETED"].includes(order.productionStatus) &&
        order.distributionStatus !== "FULLY_RECEIVED"
      );
    case "History":
      return orders.filter((order) => order.distributionStatus === "FULLY_RECEIVED");
  }
}

function formatCreatedDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDeadlineInfo(deadline: string, createdDate?: string) {
  const now = new Date();
  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const parsedDate = new Date(deadline);
  if (!Number.isNaN(parsedDate.getTime()) && deadline.includes(parsedDate.getFullYear().toString())) {
    const diffMs = normalizeDate(parsedDate).getTime() - normalizeDate(now).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return { label: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`, isOverdue: false, daysLeft: diffDays };
    }
    if (diffDays === 0) {
      return { label: "Due today", isOverdue: false, daysLeft: 0 };
    }
    const overdue = Math.abs(diffDays);
    return { label: `${overdue} day${overdue !== 1 ? "s" : ""} overdue`, isOverdue: true, daysLeft: null };
  }

  if (deadline === "Overdue" && createdDate) {
    const parsedCreated = new Date(createdDate);
    if (!Number.isNaN(parsedCreated.getTime())) {
      const daysSince = Math.floor(
        (normalizeDate(now).getTime() - normalizeDate(parsedCreated).getTime()) / (1000 * 60 * 60 * 24),
      );
      return { label: `${daysSince} days overdue`, isOverdue: true, daysLeft: null };
    }
  }
  if (deadline === "Overdue") {
    return { label: "Overdue", isOverdue: true, daysLeft: null };
  }
  const daysLeftMatch = deadline.match(/(\d+)/);
  const daysLeft = daysLeftMatch ? Number(daysLeftMatch[1]) : null;
  return { label: deadline, isOverdue: false, daysLeft };
}

function SortButton({ column, label, sort, onSortChange }: { column: SortColumn; label: string; sort: { column: SortColumn; direction: SortDirection }; onSortChange: (column: SortColumn) => void }) {
  const isActive = sort.column === column;
  return (
    <button
      type="button"
      className="-m-1 flex items-center gap-1 rounded-md p-1 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onSortChange(column)}
    >
      {label}
      {isActive ? (
        sort.direction === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}
