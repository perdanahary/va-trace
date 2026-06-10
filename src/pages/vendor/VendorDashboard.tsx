import { useMemo, useState } from "react";
import { ArrowUpRight, Eye, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { startProduction, useOrders, type StoredOrder } from "@/lib/orderStore";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";

type VendorTab = "Pending" | "Production" | "Shipping" | "History";

export function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<VendorTab>("Production");
  const orders = useOrders();

  const metrics = useMemo(() => {
    const pending = orders.filter((o) => {
      const base = getBaseOrderStatus(o.status);
      return base === "New" || base === "Waiting";
    }).length;
    const inProduction = orders.filter((o) => {
      const base = getBaseOrderStatus(o.status);
      return base === "In Production";
    }).length;
    const ready = orders.filter((o) => getBaseOrderStatus(o.status) === "Ready to Ship").length;
    const shipping = orders.filter((o) => getBaseOrderStatus(o.status) === "On Delivery").length;
    const completed = orders.filter((o) => {
      const base = getBaseOrderStatus(o.status);
      return base === "Completed" || base === "Delivered";
    }).length;

    return [
      { label: "Pending", value: String(pending).padStart(2, "0"), change: "Awaiting confirmation", color: "text-warning" },
      { label: "In Production", value: String(inProduction).padStart(2, "0"), change: "In progress", color: "text-primary" },
      { label: "Ready", value: String(ready).padStart(2, "0"), change: "Ready to dispatch", color: "text-processing" },
      { label: "Shipping", value: String(shipping).padStart(2, "0"), change: "On delivery", color: "text-processing" },
      { label: "Completed", value: String(completed).padStart(2, "0"), change: "Last 30 days", color: "text-success" },
    ];
  }, [orders]);

  const pendingOrders = useMemo(() => getOrdersForTab("Pending", orders), [orders]);
  const productionOrders = useMemo(() => getOrdersForTab("Production", orders), [orders]);
  const shippingOrders = useMemo(() => getOrdersForTab("Shipping", orders), [orders]);
  const historyOrders = useMemo(() => getOrdersForTab("History", orders), [orders]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
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

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VendorTab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Production">In Production</TabsTrigger>
              <TabsTrigger value="Shipping">Shipping</TabsTrigger>
              <TabsTrigger value="History">History</TabsTrigger>
            </TabsList>

            <TabsContent value="Pending">
              <VendorOrderTable orders={pendingOrders} tab="Pending" />
            </TabsContent>
            <TabsContent value="Production">
              <VendorOrderTable orders={productionOrders} tab="Production" />
            </TabsContent>
            <TabsContent value="Shipping">
              <VendorOrderTable orders={shippingOrders} tab="Shipping" />
            </TabsContent>
            <TabsContent value="History">
              <VendorOrderTable orders={historyOrders} tab="History" />
            </TabsContent>
          </Tabs>
        </main>
      </ContentArea>
    </div>
  );
}

function VendorOrderTable({ orders, tab }: { orders: StoredOrder[]; tab: VendorTab }) {
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
              <TableHead>Order ID</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Client PO</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const deadlineInfo = getDeadlineInfo(order.deadline, order.createdDate);
              return (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link to={`/vendor/update/${order.id}`} className="font-mono text-xs text-primary hover:underline">
                      {order.id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{order.campaign}</TableCell>
                  <TableCell className="text-sm">{order.clientPO}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCreatedDate(order.createdDate)}</TableCell>
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
                    {deadlineInfo.label}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {tab === "Pending" && (
                      <Button size="sm" onClick={() => startProduction(order.id)}>
                        <Play className="mr-1 h-3.5 w-3.5" />
                        Start Production
                      </Button>
                    )}
                    {(tab === "Production" || tab === "Shipping") && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/vendor/update/${order.id}`}>Update Progress</Link>
                      </Button>
                    )}
                    {tab === "History" && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/vendor/update/${order.id}`}>
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

function getOrdersForTab(tab: VendorTab, orders: StoredOrder[]) {
  switch (tab) {
    case "Pending":
      return orders.filter((order) => {
        const base = getBaseOrderStatus(order.status);
        return base === "New" || base === "Waiting";
      });
    case "Production":
      return orders.filter((order) => {
        const base = getBaseOrderStatus(order.status);
        return base === "In Production";
      });
    case "Shipping":
      return orders.filter((order) => {
        const base = getBaseOrderStatus(order.status);
        return base === "Ready to Ship" || base === "On Delivery";
      });
    case "History":
      return orders.filter((order) => {
        const base = getBaseOrderStatus(order.status);
        return base === "Completed" || base === "Delivered";
      });
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
