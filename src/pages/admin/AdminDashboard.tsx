import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
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
import { cn } from "@/lib/utils";
import { adminMetrics } from "@/lib/mockData";
import { useOrders } from "@/lib/orderStore";

interface AdminDashboardProps {
  role?: UserRole;
}

export function AdminDashboard({ role = "admin" }: AdminDashboardProps) {
  const navigate = useNavigate();
  const orders = useOrders();
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
      <ContentArea>
        <Header title={getHeaderTitle()} />

        <main className="space-y-8 p-4 sm:p-6 lg:p-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {adminMetrics.map((metric, index) => {
              const filterState = getMetricFilterState(metric.label);
              return (
                <Card
                  key={metric.label}
                  className="group cursor-pointer border-border/70 shadow-sm transition-colors hover:border-primary/40"
                  onClick={() => navigate("/admin/orders", { state: filterState })}
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
              );
            })}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map((order) => {
                    const deadlineInfo = getDeadlineInfo(order.deadline, order.createdDate);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-medium">{order.id}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-sm">{order.campaign}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatCreatedDate(order.createdDate)}</TableCell>
                        <TableCell className={cn("text-sm", deadlineInfo.isOverdue ? "font-semibold text-destructive" : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 ? "font-semibold text-warning" : "text-muted-foreground")}>
                          <span className="inline-flex items-center gap-1">
                            {!deadlineInfo.isOverdue && deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 && (
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                            )}
                            {deadlineInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{getOrderQuantity(order)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
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
      const daysSince = Math.floor((normalizeDate(now).getTime() - normalizeDate(parsedCreated).getTime()) / (1000 * 60 * 60 * 24));
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

function formatCreatedDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getOrderQuantity(order: { items: { quantity: number }[] }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function getMetricFilterState(label: string) {
  switch (label) {
    case "At Risk":
      return undefined;
    case "Completed":
      return { initialStatus: "Completed" };
    default:
      return undefined;
  }
}
