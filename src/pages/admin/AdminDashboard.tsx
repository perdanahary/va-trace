import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { ArrowUpRight } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderRequestTable } from "@/components/domain/tables/OrderRequestTable";
import { useHydratedOrders, useOrderListRows } from "@/lib/v2/selectors/viewModels";

interface AdminDashboardProps {
  userRole?: UserRole;
}

export function AdminDashboard({ userRole = "admin" }: AdminDashboardProps) {
  const navigate = useNavigate();
  const hydratedOrders = useHydratedOrders();
  const rows = useOrderListRows(`/${userRole}`);

  const metrics = useMemo(() => {
    const now = new Date();
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = normalize(now);

    const activeOrders = hydratedOrders.filter((entry) => entry.order.productionStatus !== "COMPLETED").length;

    const atRisk = hydratedOrders.filter((entry) => {
      const { order } = entry;
      if (order.productionStatus === "COMPLETED" && order.distributionStatus === "FULLY_RECEIVED") return false;
      const parsed = new Date(order.deadlineDate);
      if (Number.isNaN(parsed.getTime())) return false;
      const diff = Math.round((normalize(parsed).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).length;

    const completed = hydratedOrders.filter(
      (entry) => entry.order.productionStatus === "COMPLETED" && entry.order.distributionStatus === "FULLY_RECEIVED",
    ).length;

    const thisMonth = hydratedOrders.filter((entry) => {
      const created = new Date(entry.order.audit.createdAt);
      return !Number.isNaN(created.getTime()) && created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    return [
      { label: "Active Orders", value: String(activeOrders), change: "Ongoing orders", color: "text-primary" },
      { label: "At Risk", value: String(atRisk), change: "Deadline ≤ 3 days", color: "text-destructive" },
      { label: "Completed", value: String(completed), change: "Completed orders", color: "text-success" },
      { label: "Work Volume This Month", value: String(thisMonth), change: "Orders this month", color: "text-primary" },
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

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={getHeaderTitle()} />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
                <Card
                  key={metric.label}
                  className="group cursor-pointer border-border/70 shadow-sm transition-colors hover:border-primary/40"
                  onClick={() => navigate("/admin/orders")}
                >
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

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/15">
              <div>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>Latest procurement activity across the workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="group" onClick={() => navigate("/admin/orders")}>
                View all
                <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <OrderRequestTable
                rows={rows.slice(0, 5)}
                columns={["orderRequest", "project", "production", "distribution", "progress", "deadline", "created"]}
                emptyMessage="No orders yet — import purchase orders or add them manually to get started."
                onRowClick={(row) => navigate(row.actionTargets.detailPath)}
              />
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
