import {
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { adminMetrics, mockOrders } from "@/lib/mockData";

interface AdminDashboardProps {
  role?: UserRole;
}

export function AdminDashboard({ role = "admin" }: AdminDashboardProps) {
  const getHeaderTitle = () => {
    switch (role) {
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
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={getHeaderTitle()} />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {adminMetrics.map((metric, index) => (
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

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/15">
              <div>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription>Latest procurement activity across the workspace</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-sm">{order.campaign}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.createdDate}</TableCell>
                      <TableCell className={order.deadline === "Overdue" ? "text-destructive" : "text-sm text-muted-foreground"}>
                        {order.deadline}
                      </TableCell>
                      <TableCell className="text-right font-medium">{getOrderQuantity(order)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

function getOrderQuantity(order: (typeof mockOrders)[number]) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}
