import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Filter, MoreHorizontal, Play, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { FilterField, FilterSection } from "@/components/shared/FilterSection";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { startProduction, useOrders, type StoredOrder } from "@/lib/orderStore";

export function VendorOrders() {
  const orders = useOrders();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const statusOptions = useMemo(
    () => ["All Statuses", ...Array.from(new Set(orders.map((o) => o.status))).sort()],
    [orders],
  );
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [order.id, order.clientPO, order.campaign, order.supplier, formatCreatedDate(order.createdDate), order.deadline].some((v) =>
          v.toLowerCase().includes(query),
        );
      const matchesStatus = selectedStatus === "All Statuses" || order.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const visibleOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  useEffect(() => {
    const state = location.state as { initialStatus?: string } | null;
    if (state?.initialStatus && state.initialStatus !== "All Statuses") {
      setSelectedStatus(state.initialStatus);
      setShowFilters(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const clearFilters = () => {
    setSelectedStatus("All Statuses");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="vendor" />
      <ContentArea>
        <Header title="My Orders" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order ID or client PO..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFilters || selectedStatus !== "All Statuses" ? "secondary" : "outline"}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </section>

          {showFilters ? (
            <FilterSection
              actions={
                <>
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                  >
                    Reset all filters
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowFilters(false)}
                    className="h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                  >
                    Hide filters
                  </Button>
                </>
              }
            >
              <FilterField label="Status">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterSection>
          ) : null}

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client PO</TableHead>
                    <TableHead>Order Request</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <div className="mx-auto max-w-sm space-y-2">
                          <p className="text-sm font-medium">No orders found</p>
                          <p className="text-sm text-muted-foreground">Try a different vendor name, order ID, or client PO.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleOrders.map((order) => {
                      const deadlineInfo = getDeadlineInfo(order.deadline, order.createdDate);
                      const tone = getOrderTone(order);
                      const baseStatus = getBaseOrderStatus(order.status);
                      const actionTab =
                        baseStatus === "New" || baseStatus === "Waiting"
                          ? "Pending"
                          : baseStatus === "In Production"
                            ? "Production"
                            : baseStatus === "Ready to Ship" || baseStatus === "On Delivery"
                              ? "Shipping"
                              : "History";

                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            tone === "warning" && "bg-warning/10",
                            tone === "danger" && "bg-destructive/10",
                          )}
                        >
                          <TableCell>
                            <Link
                              to={`/vendor/update/${order.id}`}
                              className="text-sm font-semibold text-primary hover:underline"
                            >
                              {order.clientPO || <span className="italic text-muted-foreground">—</span>}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{order.id}</TableCell>
                          <TableCell className="text-sm">{formatCreatedDate(order.createdDate)}</TableCell>
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
                            {actionTab === "Pending" && (
                              <Button size="sm" onClick={() => startProduction(order.id)}>
                                <Play className="mr-1 h-3.5 w-3.5" />
                                Start Production
                              </Button>
                            )}
                            {actionTab !== "Pending" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {(actionTab === "Production" || actionTab === "Shipping") && (
                                    <DropdownMenuItem onClick={() => navigate(`/vendor/update/${order.id}`)}>
                                      Update Progress
                                    </DropdownMenuItem>
                                  )}
                                  {actionTab === "History" && (
                                    <DropdownMenuItem onClick={() => navigate(`/vendor/update/${order.id}`)}>
                                      <Eye className="mr-2 h-3.5 w-3.5" />
                                      View
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => navigate(`/vendor/orders/${order.id}/delivery-note`)}>
                                    Delivery note
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
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

function getOrderTone(order: StoredOrder) {
  const status = getBaseOrderStatus(order.status);
  if (status === "Urgent" || order.deadline === "Overdue") return "danger";
  if (status === "Waiting") return "warning";
  return "default";
}
