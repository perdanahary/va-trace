import { AlertCircle, CheckCircle2, Clock, Package, Truck, ChevronRight } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockOrders } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export function ClientDashboard() {
  const metrics = [
    { label: "Waiting", value: "05", icon: Clock, tone: "warning" as const },
    { label: "In production", value: "12", icon: Package, tone: "processing" as const },
    { label: "Delivery", value: "03", icon: Truck, tone: "processing" as const },
    { label: "Completed", value: "48", icon: CheckCircle2, tone: "success" as const },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="customer" />
      <div className="flex-1">
        <Header title="Customer Dashboard" />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Customer Viewer</AlertTitle>
            <AlertDescription>
              Your current account has viewer permissions. You can monitor progress and view order details, but cannot initiate new requests.
            </AlertDescription>
          </Alert>

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
                  <CardTitle className="text-base">Overview by Customer Ref PO</CardTitle>
                  <CardDescription>Current portfolio summary by PO reference</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer PO Ref</TableHead>
                      <TableHead className="text-center">WT</TableHead>
                      <TableHead className="text-center">PR</TableHead>
                      <TableHead className="text-center">DL</TableHead>
                      <TableHead className="text-center">CP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockOrders.slice(0, 4).map((order) => (
                      <TableRow key={order.clientPO}>
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{order.clientPO}</TableCell>
                        <TableCell className="text-center text-sm">1</TableCell>
                        <TableCell className="text-center text-sm">0</TableCell>
                        <TableCell className="text-center text-sm">0</TableCell>
                        <TableCell className="text-center text-sm">0</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                        <TableCell className="text-center text-sm">5</TableCell>
                        <TableCell className="text-center text-sm">3</TableCell>
                        <TableCell className="text-center text-sm">2</TableCell>
                        <TableCell className="text-center text-sm">10</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Visible Orders</CardTitle>
              <CardDescription>Read-only view of the latest orders in your portfolio</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                  {mockOrders.slice(0, 3).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                      <TableCell className="text-sm">{order.campaign}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.deadline}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
