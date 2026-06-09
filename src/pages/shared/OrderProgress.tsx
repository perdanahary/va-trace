import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, ExternalLink, Filter } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterField, FilterSection } from "@/components/shared/FilterSection";
import { mockOrders, mockSalesPoints, mockProducts } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface OrderProgressProps {
  role: UserRole;
}

export function OrderProgress({ role }: OrderProgressProps) {
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Flatten orders into items for the table
  const flattenedItems = useMemo(() => {
    return mockOrders.flatMap((order) =>
      order.items.map((item) => {
        const salesPoint = mockSalesPoints.find((sp) => sp.wcode === order.salesPointId);
        const product = mockProducts.find((p) => p.code === item.productCode);

        return {
          ...item,
          uniqueId: `${order.id}-${item.id}`,
          orderId: order.id,
          clientPO: order.clientPO,
          supplier: order.supplier,
          salesPointLabel: salesPoint
            ? `${salesPoint.wcode} - ${salesPoint.salesPoint}`
            : order.salesPointId,
          salesPointHierarchy: salesPoint
            ? `${salesPoint.zone} / ${salesPoint.region} / ${salesPoint.area}`
            : "",
          productBrand: product?.brand || "Unknown Brand",
          productName: product?.name || item.name,
          deadline: order.deadline,
        };
      })
    );
  }, []);

  // Derive unique filter options from data
  const vendorOptions = useMemo(() => {
    const unique = new Set(flattenedItems.map((item) => item.supplier));
    return Array.from(unique).sort();
  }, [flattenedItems]);

  const brandOptions = useMemo(() => {
    const unique = new Set(flattenedItems.map((item) => item.productBrand));
    return Array.from(unique).sort();
  }, [flattenedItems]);

  const locationOptions = useMemo(() => {
    const unique = new Set(flattenedItems.map((item) => item.salesPointHierarchy || item.salesPointLabel));
    return Array.from(unique).sort();
  }, [flattenedItems]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const counts = {
      total: flattenedItems.length,
      delivered: 0,
      onDelivery: 0,
      readyToShip: 0,
      inProduction: 0,
      prodFinished: 0,
      notStarted: 0,
    };

    flattenedItems.forEach((item) => {
      switch (item.status) {
        case "Delivered":
        case "Completed":
          counts.delivered++;
          break;
        case "On Delivery":
          counts.onDelivery++;
          break;
        case "Ready to Ship":
          counts.readyToShip++;
          break;
        case "In Production":
          counts.inProduction++;
          break;
        case "Created":
        case "Accepted":
          counts.notStarted++;
          break;
      }
    });

    return [
      { label: "Total Items", value: counts.total, color: "text-foreground", filter: "All Statuses" },
      { label: "Delivered", value: counts.delivered, color: "text-success", filter: "Completed" },
      { label: "On Delivery", value: counts.onDelivery, color: "text-warning", filter: "On Delivery" },
      { label: "Ready to Ship", value: counts.readyToShip, color: "text-primary", filter: "Ready to Ship" },
      { label: "On Progress", value: counts.inProduction, color: "text-processing", filter: "In Production" },
      { label: "Prod. Finished", value: counts.prodFinished, color: "text-primary", filter: "Prod. Finished" },
      { label: "Not Started", value: counts.notStarted, color: "text-muted-foreground", filter: "Created" },
    ];
  }, [flattenedItems]);

  const filteredItems = useMemo(() => {
    return flattenedItems.filter(item => {
      if (statusFilter !== "All Statuses") {
        if (statusFilter === "Completed") {
          if (item.status !== "Delivered" && item.status !== "Completed") return false;
        } else if (item.status !== statusFilter) return false;
      }
      if (vendorFilter !== "all" && item.supplier !== vendorFilter) return false;
      if (brandFilter !== "all" && item.productBrand !== brandFilter) return false;
      if (locationFilter !== "all") {
        const loc = item.salesPointHierarchy || item.salesPointLabel;
        if (loc !== locationFilter) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.clientPO.toLowerCase().includes(q) ||
          item.orderId.toLowerCase().includes(q) ||
          item.supplier.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q) ||
          item.productCode.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [flattenedItems, statusFilter, vendorFilter, brandFilter, locationFilter, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <ContentArea>
        <Header title={`${role.toUpperCase()} - Order Progress Tracking`} />

        <main className="mx-auto space-y-6 p-4 sm:p-6 lg:p-8">

          {/* Statistic Cards */}
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
            {metrics.map((metric) => (
              <Card
                key={metric.label}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  statusFilter === metric.filter ? "border-primary ring-1 ring-primary" : "border-border/70"
                )}
                onClick={() => setStatusFilter(metric.filter)}
              >
                <CardContent className="p-4 flex flex-col justify-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{metric.label}</p>
                  <h3 className={cn("text-2xl font-bold", metric.color)}>{metric.value}</h3>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Search + Filter Toggle */}
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search item, OR, vendor, client re" className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showFilters || statusFilter !== "All Statuses" ? "secondary" : "outline"}
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </section>

          {/* Filters (collapsible) */}
          {showFilters && (
            <FilterSection
              actions={
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setShowFilters(false)}
                    className="h-auto px-0 font-normal text-muted-foreground hover:bg-transparent hover:text-primary hover:underline"
                  >
                    Hide filters
                  </Button>
                </>
              }
              contentClassName="grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
            >
              <FilterField label="Status">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Statuses">All Statuses</SelectItem>
                    <SelectItem value="Created">Created / Not Started</SelectItem>
                    <SelectItem value="In Production">In Production</SelectItem>
                    <SelectItem value="Ready to Ship">Ready to Ship</SelectItem>
                    <SelectItem value="On Delivery">On Delivery</SelectItem>
                    <SelectItem value="Completed">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Vendor">
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendorOptions.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Brand">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brandOptions.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Location">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locationOptions.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Phase">
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Phases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="In Production">In Production</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="Transit">Transit</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterSection>
          )}

          {/* Data Table */}
          <section className="rounded-md border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent text-[10px] uppercase tracking-wider">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Client PO Ref</TableHead>
                    <TableHead className="min-w-[140px] font-semibold">OR Number</TableHead>
                    <TableHead className="min-w-[200px] font-semibold">Sales Point</TableHead>
                    <TableHead className="min-w-[160px] font-semibold">Vendor</TableHead>
                    <TableHead className="min-w-[300px] font-semibold">Item</TableHead>
                    <TableHead className="min-w-[120px] font-semibold">Status</TableHead>
                    <TableHead className="min-w-[160px] font-semibold">Overall Progress</TableHead>
                    <TableHead className="min-w-[100px] font-semibold">Deadline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isExpanded = expandedRows.has(item.uniqueId);
                    const isDelivered = item.status === "Delivered" || item.status === "Completed";

                    // Simple progress calculation based on status (mocked for demo)
                    const progressPercent = isDelivered ? 100 : item.status === "Ready to Ship" ? 75 : item.status === "In Production" ? 40 : 10;

                    return (
                      <React.Fragment key={item.uniqueId}>
                        {/* Collapsed Row */}
                        <TableRow
                          className={cn("cursor-pointer transition-colors hover:bg-muted/30", isExpanded && "bg-muted/10 border-b-0")}
                          onClick={() => toggleRow(item.uniqueId)}
                        >
                          <TableCell>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="font-semibold text-xs">{item.clientPO}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-semibold text-xs">
                              {item.orderId}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs">{item.salesPointLabel}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{item.salesPointHierarchy}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.supplier}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs truncate max-w-[280px]">{item.productName}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                                {item.productCode} • {item.productBrand}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progressPercent} className="h-1.5 w-16" />
                              <span className="text-[10px] font-medium whitespace-nowrap text-muted-foreground">
                                {item.deliveredQuantity || 0} / {item.quantity} done
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.deadline}</TableCell>
                        </TableRow>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={9} className="p-0 border-b">
                              <div className="px-14 py-6 border-t border-border/50 animate-in fade-in-0 duration-200">
                                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
                                  {/* Detailed Metrics */}
                                  <div className="col-span-1 lg:col-span-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Item Fulfillment Progress</h4>
                                      <span className="text-xs text-muted-foreground">
                                        <strong className="text-foreground">{item.quantity}</strong> total units
                                      </span>
                                    </div>
                                    <SegmentedProgress
                                      segments={[
                                        { label: "In Production", value: item.status === "In Production" ? Math.max(0, item.quantity - (item.deliveredQuantity ?? 0)) : 0, color: "bg-processing" },
                                        { label: "Ready", value: item.status === "Ready to Ship" ? Math.max(0, item.quantity - (item.deliveredQuantity ?? 0)) : 0, color: "bg-primary" },
                                        { label: "Transit", value: item.status === "On Delivery" ? Math.max(0, item.quantity - (item.deliveredQuantity ?? 0)) : 0, color: "bg-warning" },
                                        { label: "Delivered", value: item.deliveredQuantity ?? 0, color: "bg-success" },
                                      ]}
                                      total={item.quantity}
                                    />
                                  </div>

                                  {/* Milestone Info */}
                                  <div className="col-span-1 lg:col-span-2 lg:border-l lg:pl-8">
                                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Next Action</h4>
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold">{!isDelivered ? "Shipment Pick-up" : "Fully Received"}</p>
                                      {!isDelivered && (
                                        <p className="text-xs font-medium text-primary">Expected soon</p>
                                      )}
                                    </div>
                                    <Button size="sm" variant="outline" className="mt-4 text-xs h-8">
                                      View Item History
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                        No items found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </main>
      </ContentArea>
    </div>
  );
}

function SegmentedProgress({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          return (
            <div
              key={seg.label}
              className={cn(
                "h-full transition-all",
                seg.value > 0 ? seg.color : "bg-transparent",
                i === 0 && "rounded-l-full",
                i === segments.length - 1 && "rounded-r-full"
              )}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className={cn("flex items-center gap-1.5 text-[10px] font-medium", seg.value === 0 ? "text-muted-foreground/50" : "text-muted-foreground")}>
            <span className={cn("inline-block h-2 w-2 rounded-sm", seg.value > 0 ? seg.color : "bg-muted-foreground/30")} />
            <span className="uppercase tracking-wider">{seg.label}</span>
            <span className={cn("font-bold", seg.value > 0 ? "text-foreground" : "text-muted-foreground/50")}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

