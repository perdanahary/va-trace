import { useMemo } from "react";
import { AlertCircle, Building2, CheckCircle2, Clock, Package, Truck, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OrderMetadataSummary } from "@/components/shared/OrderMetadataSummary";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useOrders } from "@/lib/orderStore";
import { useCurrentUser } from "@/lib/authStore";
import { useClientStore } from "@/lib/clientStore";


function orderStatusToMetricBucket(status: string): "waiting" | "production" | "delivery" | "completed" {
  const base = status.startsWith("Partial ") ? status.replace("Partial ", "") : status;
  switch (base) {
    case "In Production":
      return "production";
    case "Ready to Ship":
    case "On Delivery":
      return "delivery";
    case "Delivered":
    case "Completed":
      return "completed";
    default:
      return "waiting";
  }
}

export function ClientDashboard() {
  const orders = useOrders();
  const { currentUser } = useCurrentUser();
  const { clients } = useClientStore();

  const linkedClient = useMemo(
    () => (currentUser ? clients.find((c) => c.linkedUserId === currentUser.id) : null),
    [currentUser, clients],
  );

  const clientOrders = useMemo(
    () => (linkedClient ? orders.filter((o) => o.clientId === linkedClient.id) : []),
    [orders, linkedClient],
  );

  const metrics = useMemo(() => {
    const counts = { waiting: 0, production: 0, delivery: 0, completed: 0 };
    for (const order of clientOrders) {
      const bucket = orderStatusToMetricBucket(order.status);
      counts[bucket]++;
    }
    return [
      { label: "Waiting", value: String(counts.waiting).padStart(2, "0"), icon: Clock, tone: "warning" as const },
      { label: "In production", value: String(counts.production).padStart(2, "0"), icon: Package, tone: "processing" as const },
      { label: "Delivery", value: String(counts.delivery).padStart(2, "0"), icon: Truck, tone: "processing" as const },
      { label: "Completed", value: String(counts.completed).padStart(2, "0"), icon: CheckCircle2, tone: "success" as const },
    ];
  }, [clientOrders]);

  const poRefs = useMemo(
    () =>
      Object.entries(
        clientOrders.reduce<Record<string, { wt: number; pr: number; dl: number; cp: number }>>((acc, o) => {
          const po = o.clientPO || o.id;
          if (!acc[po]) acc[po] = { wt: 0, pr: 0, dl: 0, cp: 0 };
          const bucket = orderStatusToMetricBucket(o.status);
          if (bucket === "waiting") acc[po].wt++;
          else if (bucket === "production") acc[po].pr++;
          else if (bucket === "delivery") acc[po].dl++;
          else if (bucket === "completed") acc[po].cp++;
          return acc;
        }, {}),
      )
        .slice(0, 4)
        .map(([ref, counts]) => ({ ref, ...counts })),
    [clientOrders],
  );

  if (!currentUser) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole="client" />
        <ContentArea>
          <Header title="Client Dashboard" />
          <main className="space-y-8 p-4 sm:p-6 lg:p-8">
            <Alert className="border-warning/20 bg-warning/5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertTitle>No User Selected</AlertTitle>
              <AlertDescription>
                Use the Role Switcher (bottom-right) to select a client user account.{" "}
                <Link to="/admin/users" className="underline">Manage users</Link>
              </AlertDescription>
            </Alert>
          </main>
        </ContentArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="client" />
      <ContentArea>
        <Header title="Client Dashboard" />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 bg-muted/20 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                {linkedClient ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {linkedClient.entityName} &middot; <span className="font-mono">{linkedClient.id}</span>
                  </p>
                ) : null}
              </div>
              <Badge variant="secondary" className="shrink-0 rounded-full px-3 text-[10px] uppercase tracking-[0.2em]">
                {currentUser.status}
              </Badge>
            </CardContent>
          </Card>

          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardDescription className="uppercase tracking-[0.24em]">{metric.label}</CardDescription>
                    <CardTitle className={cn("text-3xl", metric.tone === "warning" && "text-warning", metric.tone === "processing" && "text-processing", metric.tone === "success" && "text-success")}>
                      {metric.value}
                    </CardTitle>
                  </div>
                  <div className={cn("rounded-md p-2", metric.tone === "warning" && "bg-warning/10", metric.tone === "processing" && "bg-processing/10", metric.tone === "success" && "bg-success/10")}>
                    <metric.icon className={cn("h-4 w-4", metric.tone === "warning" && "text-warning", metric.tone === "processing" && "text-processing", metric.tone === "success" && "text-success")} />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Overview by Client Ref PO</CardTitle>
                  <CardDescription>Current portfolio summary by PO reference</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {poRefs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client PO Ref</TableHead>
                        <TableHead className="text-center">WT</TableHead>
                        <TableHead className="text-center">PR</TableHead>
                        <TableHead className="text-center">DL</TableHead>
                        <TableHead className="text-center">CP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poRefs.map((entry) => (
                        <TableRow key={entry.ref}>
                          <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{entry.ref}</TableCell>
                          <TableCell className="text-center text-sm">{entry.wt}</TableCell>
                          <TableCell className="text-center text-sm">{entry.pr}</TableCell>
                          <TableCell className="text-center text-sm">{entry.dl}</TableCell>
                          <TableCell className="text-center text-sm">{entry.cp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">No orders yet.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Breakdown by Zone</CardTitle>
                <CardDescription>Distribution of active requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-center">WT</TableHead>
                      <TableHead className="text-center">PR</TableHead>
                      <TableHead className="text-center">DL</TableHead>
                      <TableHead className="text-center">CP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["Jakarta", "North Sumatera", "South Sumatera", "West Java"].map((zone) => (
                      <TableRow key={zone}>
                        <TableCell className="text-sm font-medium">{zone}</TableCell>
                        <TableCell className="text-center text-sm">{clientOrders.filter(o => orderStatusToMetricBucket(o.status) === "waiting").length}</TableCell>
                        <TableCell className="text-center text-sm">{clientOrders.filter(o => orderStatusToMetricBucket(o.status) === "production").length}</TableCell>
                        <TableCell className="text-center text-sm">{clientOrders.filter(o => orderStatusToMetricBucket(o.status) === "delivery").length}</TableCell>
                        <TableCell className="text-center text-sm">{clientOrders.filter(o => orderStatusToMetricBucket(o.status) === "completed").length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <CardDescription>Latest orders for {linkedClient?.entityName ?? currentUser.company}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {clientOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientOrders.slice(0, 5).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div>{order.campaign ?? ""}</div>
                            <OrderMetadataSummary tags={order.tags} referenceLink={order.referenceLink} />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{order.deadline}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No orders found for this client.</div>
              )}
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
