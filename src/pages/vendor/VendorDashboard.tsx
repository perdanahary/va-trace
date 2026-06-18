import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardMetricCard } from "@/components/shared/DashboardMetricCard";
import { VendorOrderTable, type VendorTab, type SortColumn, type SortDirection } from "@/components/domain/tables/VendorOrderTable";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";
import type { OrderListRow } from "@/lib/types/v2/orderRequest";

export function VendorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VendorTab>("Pending");
  const [sortState, setSortState] = useState<{ column: SortColumn; direction: SortDirection }>({ column: "created", direction: "desc" });
  const rows = useOrderListRows("/vendor");

  const submittedCount = rows.filter((r) => r.productionStatus === "SUBMITTED").length;

  const metrics = useMemo(() => {
    const pending = rows.filter((r) => r.productionStatus === "NEW" || r.productionStatus === "SUBMITTED").length;
    const inProduction = rows.filter((r) =>
      ["ACCEPTED", "IN_PROGRESS"].includes(r.productionStatus),
    ).length;
    const ready = rows.filter((r) => r.productionStatus === "COMPLETED").length;
    const shipping = rows.filter((r) =>
      ["PARTIALLY_DISTRIBUTED", "FULLY_DISTRIBUTED", "PARTIALLY_RECEIVED"].includes(r.distributionStatus),
    ).length;
    const completed = rows.filter((r) => r.productionStatus === "COMPLETED" && r.distributionStatus === "FULLY_RECEIVED").length;

    return [
      { label: "Pending", value: String(pending), sublabel: "Needs your confirmation", color: "text-warning" },
      { label: "In Production", value: String(inProduction), sublabel: "In progress", color: "text-primary" },
      { label: "Ready", value: String(ready), sublabel: "Ready to dispatch", color: "text-processing" },
      { label: "Shipping", value: String(shipping), sublabel: "On delivery", color: "text-processing" },
      { label: "Completed", value: String(completed), sublabel: "Last 30 days", color: "text-success" },
    ];
  }, [rows]);

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

  const handleSortChange = (column: SortColumn) =>
    setSortState((prev) => ({ column, direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc" }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="vendor" />
      <ContentArea>
        <Header title="Vendor Dashboard" />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {metrics.map((metric, index) => (
              <DashboardMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                sublabel={metric.sublabel}
                color={metric.color}
                index={index}
                onClick={() => navigate("/vendor/orders")}
              />
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
              <VendorOrderTable orders={pendingOrders} tab="Pending" sort={sortState} onSortChange={handleSortChange} />
            </TabsContent>
            <TabsContent value="Production">
              <VendorOrderTable orders={productionOrders} tab="Production" sort={sortState} onSortChange={handleSortChange} />
            </TabsContent>
            <TabsContent value="Shipping">
              <VendorOrderTable orders={shippingOrders} tab="Shipping" sort={sortState} onSortChange={handleSortChange} />
            </TabsContent>
            <TabsContent value="History">
              <VendorOrderTable orders={historyOrders} tab="History" sort={sortState} onSortChange={handleSortChange} />
            </TabsContent>
          </Tabs>
        </main>
      </ContentArea>
    </div>
  );
}

function getOrdersForTab(tab: VendorTab, orders: OrderListRow[]) {
  switch (tab) {
    case "Pending":
      return orders.filter((order) => order.productionStatus === "SUBMITTED");
    case "Production":
      return orders.filter((order) => ["ACCEPTED", "IN_PROGRESS"].includes(order.productionStatus));
    case "Shipping":
      return orders.filter((order) =>
        order.productionStatus === "COMPLETED" ||
        (order.distributionStatus != null && order.distributionStatus !== "NOT_STARTED" && order.distributionStatus !== "FULLY_RECEIVED")
      );
    case "History":
      return orders.filter((order) => order.distributionStatus === "FULLY_RECEIVED");
  }
}
