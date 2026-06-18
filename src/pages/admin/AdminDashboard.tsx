import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ArrowUpRight } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricCard } from "@/components/shared/DashboardMetricCard";
import { OrderRequestTable, type SortableColumn, type SortDirection } from "@/components/domain/tables/OrderRequestTable";
import { useHydratedOrders, useOrderListRows } from "@/lib/v2/selectors/viewModels";

interface AdminDashboardProps {
  userRole?: UserRole;
}

export function AdminDashboard({ userRole = "admin" }: AdminDashboardProps) {
  const navigate = useNavigate();
  const hydratedOrders = useHydratedOrders();
  const rows = useOrderListRows(`/${userRole}`);
  const [sortState, setSortState] = useState<{ column: SortableColumn; direction: SortDirection }>({ column: "created", direction: "desc" });

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
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
  }, [rows, sortState]);

  const metrics = useMemo(() => {
    const now = new Date();
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = normalize(now);

    let activeOrders = 0;
    let inProduction = 0;
    let inDistribution = 0;
    let atRisk = 0;
    let exceptions = 0;
    let completed = 0;
    let thisMonth = 0;

    for (const entry of hydratedOrders) {
      const { order } = entry;
      const ps = order.productionStatus;
      const ds = order.distributionStatus;

      if (ps !== "COMPLETED") activeOrders++;

      if (ps === "ACCEPTED" || ps === "IN_PROGRESS") inProduction++;
      if (ds === "PARTIALLY_DISTRIBUTED" || ds === "FULLY_DISTRIBUTED" || ds === "PARTIALLY_RECEIVED") inDistribution++;

      if (!(ps === "COMPLETED" && ds === "FULLY_RECEIVED")) {
        const parsed = new Date(order.deadlineDate);
        if (!Number.isNaN(parsed.getTime())) {
          const diff = Math.round((normalize(parsed).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diff >= 0 && diff <= 3) atRisk++;
        }
      }

      if (order.exceptionSummary.hasException) exceptions++;

      if (ps === "COMPLETED" && ds === "FULLY_RECEIVED") completed++;

      const created = new Date(order.audit.createdAt);
      if (!Number.isNaN(created.getTime()) && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()) {
        thisMonth++;
      }
    }

    return [
      { label: "Active Orders", value: String(activeOrders), sublabel: "Ongoing orders", color: "text-primary" },
      { label: "In Production", value: String(inProduction), sublabel: "Accepted / in progress", color: "text-processing" },
      { label: "In Distribution", value: String(inDistribution), sublabel: "Being shipped / received", color: "text-processing" },
      { label: "At Risk", value: String(atRisk), sublabel: "Deadline ≤ 3 days", color: "text-destructive" },
      { label: "Exceptions", value: String(exceptions), sublabel: "Orders with issues", color: "text-warning" },
      { label: "Completed", value: String(completed), sublabel: "Fully delivered & received", color: "text-success" },
      { label: "This Month", value: String(thisMonth), sublabel: "Orders created this month", color: "text-primary" },
    ];
  }, [hydratedOrders]);

  const getHeaderTitle = () => {
    switch (userRole) {
      case "analyst":
        return "Insights & Reports";
      case "operator":
        return "Order Management";
      default:
        return "Procurement Dashboard";
    }
  };

  const handleSortChange = (column: SortableColumn) =>
    setSortState((prev) => ({ column, direction: prev.column === column && prev.direction === "desc" ? "asc" : "desc" }));

  const goToOrders = () => navigate("/admin/orders");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={getHeaderTitle()} />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <DashboardMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                sublabel={metric.sublabel}
                color={metric.color}
                index={index}
                onClick={goToOrders}
              />
            ))}
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/15">
              <div>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>Latest procurement activity across the workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="group" onClick={goToOrders}>
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <OrderRequestTable
                rows={sortedRows.slice(0, 5)}
                columns={["orderRequest", "project", "production", "distribution", "progress", "created", "deadline", "orderedQuantity"]}
                emptyMessage="No orders yet — import purchase orders or add them manually to get started."
                onRowClick={(row) => navigate(row.actionTargets.detailPath)}
                sort={sortState}
                onSortChange={handleSortChange}
              />
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
