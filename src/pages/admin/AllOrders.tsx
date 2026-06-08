import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Filter, MoreHorizontal, Plus, Search } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { useOrders } from "@/lib/orderStore";
import type { Order } from "@/lib/mockData";

interface AllOrdersProps {
  role?: UserRole;
}

export function AllOrders({ role = "admin" }: AllOrdersProps) {
  const orders = useOrders();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedVendor, setSelectedVendor] = useState("All Vendors");
  const [currentPage, setCurrentPage] = useState(1);
  const detailPath = (id: string) => (role === "admin" ? `/admin/orders/${id}` : `/${role}/orders/${id}`);
  const createPath = role === "admin" ? "/admin/create" : role === "operator" ? "/operator/create" : "/admin/create";
  const showVendorColumn = role !== "vendor";
  const pageSize = 5;

  const statusOptions = useMemo(() => ["All Statuses", ...Array.from(new Set(orders.map((order) => order.status))).sort()], [orders]);
  const vendorOptions = useMemo(() => ["All Vendors", ...Array.from(new Set(orders.map((order) => order.supplier))).sort()], [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        [order.id, order.clientPO, order.campaign, order.supplier, formatCreatedDate(order.createdDate), order.deadline].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesStatus = selectedStatus === "All Statuses" || order.status === selectedStatus;
      const matchesVendor = selectedVendor === "All Vendors" || order.supplier === selectedVendor;
      return matchesSearch && matchesStatus && matchesVendor;
    });
  }, [orders, searchTerm, selectedStatus, selectedVendor]);

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
  }, [searchTerm, selectedStatus, selectedVendor]);

  const clearFilters = () => {
    setSelectedStatus("All Statuses");
    setSelectedVendor("All Vendors");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title="All Order Requests" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by vendor name, order ID, or client PO..."
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showFilters || selectedStatus !== "All Statuses" || selectedVendor !== "All Vendors" ? "secondary" : "outline"}
                onClick={() => setShowFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => navigate(createPath)}>
                <Plus className="h-4 w-4" />
                Create New OR
              </Button>
            </div>
          </section>

          {showFilters ? (
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Filters</CardTitle>
                <CardDescription>Refine by status and vendor.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
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
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Vendor</p>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorOptions.map((vendor) => (
                        <SelectItem key={vendor} value={vendor}>
                          {vendor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <Button variant="ghost" onClick={clearFilters} className="px-0">
                    Reset all filters
                  </Button>
                  <Button variant="ghost" onClick={() => setShowFilters(false)} className="px-0 text-muted-foreground">
                    Hide filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Order Requests</CardTitle>
                <CardDescription>{filteredOrders.length} matching records</CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                {selectedStatus !== "All Statuses" || selectedVendor !== "All Vendors" ? "Filtered" : "All"}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Request</TableHead>
                    <TableHead>Client PO</TableHead>
                    {showVendorColumn ? <TableHead>Vendor</TableHead> : null}
                    <TableHead>Date Created</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showVendorColumn ? 7 : 6} className="py-16 text-center">
                        <div className="mx-auto max-w-sm space-y-2">
                          <p className="text-sm font-medium">No order requests found</p>
                          <p className="text-sm text-muted-foreground">Try a different vendor name, order ID, or client PO.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleOrders.map((order) => {
                      const deadlineInfo = getDeadlineInfo(order.deadline);
                      const tone = getOrderTone(order);

                      return (
                        <TableRow
                          key={order.id}
                          className={cn(
                            tone === "warning" && "bg-warning/10",
                            tone === "danger" && "bg-destructive/10",
                          )}
                        >
                          <TableCell>
                            <Link to={detailPath(order.id)} className="font-mono text-xs font-semibold text-primary hover:underline">
                              {order.id}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{order.clientPO}</TableCell>
                          {showVendorColumn ? (
                            <TableCell className={cn("text-sm", order.supplier === "Pending" && "italic text-destructive")}>{order.supplier}</TableCell>
                          ) : null}
                          <TableCell className="text-sm">{formatCreatedDate(order.createdDate)}</TableCell>
                          <TableCell className={cn("text-sm", deadlineInfo.isOverdue ? "font-semibold text-destructive" : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 ? "font-semibold text-warning" : "text-muted-foreground")}>
                            {deadlineInfo.label}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(detailPath(order.id))}>Open details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`${detailPath(order.id)}/packaging-labels`)}>Packaging labels</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`${detailPath(order.id)}/delivery-note`)}>Delivery note</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </main>
      </div>
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

function getDeadlineInfo(deadline: string) {
  if (deadline === "Overdue") {
    return { label: "Overdue", isOverdue: true, daysLeft: null };
  }
  const daysLeftMatch = deadline.match(/(\d+)/);
  const daysLeft = daysLeftMatch ? Number(daysLeftMatch[1]) : null;
  return { label: deadline, isOverdue: false, daysLeft };
}

function getOrderTone(order: Order) {
  const status = getBaseOrderStatus(order.status);
  if (status === "Urgent" || order.deadline === "Overdue") return "danger";
  if (status === "Waiting") return "warning";
  return "default";
}
