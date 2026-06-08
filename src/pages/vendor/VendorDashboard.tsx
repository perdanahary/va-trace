import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, FileText, Inbox, MoreHorizontal, Package, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrders, type StoredOrder } from "@/lib/orderStore";
import { cn } from "@/lib/utils";

type VendorTab = "Pending" | "Production" | "Shipping" | "History";

export function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<VendorTab>("Production");
  const orders = useOrders();

  const metrics = [
    { label: "Pending", value: "02", tone: "warning" as const },
    { label: "Production", value: "08", tone: "processing" as const },
    { label: "Ready", value: "03", tone: "processing" as const },
    { label: "Shipping", value: "01", tone: "processing" as const },
    { label: "Completed", value: "124", tone: "success" as const },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <div className="flex-1">
        <Header title="Vendor Dashboard" />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <Alert className="border-primary/20 bg-primary/5">
            <Inbox className="h-4 w-4 text-primary" />
            <AlertTitle>Inbox Order</AlertTitle>
            <AlertDescription>1 order is awaiting your confirmation.</AlertDescription>
          </Alert>

          <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-border/70 shadow-sm">
                <CardHeader className="space-y-2 pb-2">
                  <CardDescription className="uppercase tracking-[0.24em]">{metric.label}</CardDescription>
                  <CardTitle className={cn(metric.tone === "warning" && "text-warning", metric.tone === "processing" && "text-processing", metric.tone === "success" && "text-success")}>
                    {metric.value}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </section>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as VendorTab)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Production">Production</TabsTrigger>
              <TabsTrigger value="Shipping">Shipping</TabsTrigger>
              <TabsTrigger value="History">History</TabsTrigger>
            </TabsList>

            <TabsContent value="Pending" className="space-y-4">
              {getOrdersForTab("Pending", orders).map((order, index) => (
                <VendorOrderCard key={order.id} order={order} index={index} />
              ))}
            </TabsContent>
            <TabsContent value="Production" className="space-y-4">
              {getOrdersForTab("Production", orders).map((order, index) => (
                <VendorOrderCard key={order.id} order={order} index={index} />
              ))}
            </TabsContent>
            <TabsContent value="Shipping" className="space-y-4">
              {getOrdersForTab("Shipping", orders).map((order, index) => (
                <VendorOrderCard key={order.id} order={order} index={index} />
              ))}
            </TabsContent>
            <TabsContent value="History" className="space-y-4">
              {getOrdersForTab("History", orders).map((order, index) => (
                <VendorOrderCard key={order.id} order={order} index={index} />
              ))}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function VendorOrderCard({ order, index }: { order: StoredOrder; index: number }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">{order.id}</span>
                  <StatusBadge status={order.status} />
                  {order.status === "Overdue" ? (
                    <Badge variant="destructive" className="rounded-full uppercase tracking-[0.18em]">
                      Overdue
                    </Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 text-base font-semibold tracking-tight">{order.campaign}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>PO: {order.clientPO}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Created: {order.createdDate}</span>
              </div>
              <div className={cn("flex items-center gap-2 text-sm", order.deadline === "Overdue" ? "text-destructive font-medium" : "text-muted-foreground")}>
                <Clock className="h-4 w-4" />
                <span>Deadline: {order.deadline}</span>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Notes</p>
              <p className="text-sm text-muted-foreground">Please wrap in bubble wrap as requested by the client.</p>
            </div>
          </div>

          <div className="w-full space-y-4 border-t pt-4 xl:w-96 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Itemized Progress</h4>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                {index + 1}
              </Badge>
            </div>
            <div className="space-y-3">
              <ProgressRow label="Production" current={200} total={750} />
              <ProgressRow label="Ready to Ship" current={100} total={750} />
              <ProgressRow label="On Delivery" current={100} total={750} />
              <ProgressRow label="Delivered" current={100} total={750} />
            </div>
            <Button asChild className="w-full">
              <Link to={`/vendor/update/${order.id}`}>Update Progress</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, current, total }: { label: string; current: number; total: number }) {
  const percentage = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        <span>
          {current}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

function getOrdersForTab(tab: VendorTab, orders: StoredOrder[]) {
  switch (tab) {
    case "Pending":
      return orders.filter((order) => order.status === "Created" || order.status === "Waiting").slice(0, 3);
    case "Production":
      return orders.filter((order) => order.status === "In Production" || order.status === "Accepted").slice(0, 3);
    case "Shipping":
      return orders.filter((order) => order.status === "Ready to Ship" || order.status === "On Delivery").slice(0, 3);
    case "History":
      return orders.filter((order) => order.status === "Completed" || order.status === "Delivered").slice(0, 3);
  }
}
