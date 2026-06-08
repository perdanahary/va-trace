import { Sidebar, UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getBaseOrderStatus } from "@/lib/orderStatus";
import { cn } from "@/lib/utils";
import { Filter, Search, Download, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrders } from "@/lib/orderStore";

interface AllOrdersProps {
  role?: UserRole;
}

export function AllOrders({ role = 'admin' }: AllOrdersProps) {
  const orders = useOrders();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedVendor, setSelectedVendor] = useState("All Vendors");
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const detailPath = (id: string) => role === 'admin' ? `/admin/orders/${id}` : `/${role}/orders/${id}`;
  const createPath = role === "admin" ? "/admin/create" : role === "operator" ? "/operator/create" : "/admin/create";
  const showVendorColumn = role !== "vendor";
  const pageSize = 4;

  const statusOptions = useMemo(() => {
    return ["All Statuses", ...Array.from(new Set(orders.map((order) => order.status))).sort()];
  }, [orders]);

  const vendorOptions = useMemo(() => {
    return ["All Vendors", ...Array.from(new Set(orders.map((order) => order.supplier))).sort()];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch = !query || [
        order.id,
        order.clientPO,
        order.campaign,
        order.supplier,
        formatCreatedDate(order.createdDate),
        order.deadline,
      ].some((value) => value.toLowerCase().includes(query));

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

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-order-action-menu]") && !target.closest("[data-order-action-button]")) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const clearFilters = () => {
    setSelectedStatus("All Statuses");
    setSelectedVendor("All Vendors");
    setSearchTerm("");
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title="All Order Requests" />
        
        <main className="p-8 space-y-6">
          {/* Controls Bar */}
          <section className="flex flex-col md:flex-row gap-4 items-center justify-between animate-in-smart">
            <div className="relative w-full md:w-96 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by vendor name, order ID, or client PO..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowFilters((value) => !value)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border rounded-md text-xs font-bold transition-colors btn-press",
                  showFilters || selectedStatus !== "All Statuses" || selectedVendor !== "All Vendors"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-white border-border hover:bg-accent text-foreground"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md text-xs font-bold hover:bg-accent transition-colors btn-press">
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <div className="w-px h-8 bg-border mx-1"></div>
              <button
                onClick={() => navigate(createPath)}
                className="px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-colors btn-press shadow-md"
              >
                Create New OR
              </button>
            </div>
          </section>

          {showFilters && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-border rounded-lg shadow-sm animate-in-smart">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  className="w-full px-3 py-2 bg-canvas-white border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Vendor</label>
                <select
                  value={selectedVendor}
                  onChange={(event) => setSelectedVendor(event.target.value)}
                  className="w-full px-3 py-2 bg-canvas-white border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  {vendorOptions.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end justify-between gap-3 pb-0.5">
                <button
                  onClick={clearFilters}
                  className="text-[10px] font-bold text-primary hover:underline px-1"
                >
                  Reset all filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-1"
                >
                  Hide filters
                </button>
              </div>
            </section>
          )}

          {/* Main Data List */}
          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div
                  className={cn(
                    "grid gap-4 px-5 py-3 bg-accent/30 border-b border-border text-[10px] uppercase tracking-wider font-bold text-muted-foreground",
                  showVendorColumn ? "grid-cols-[1.2fr_1fr_1.7fr_0.9fr_1.1fr_0.85fr_auto]" : "grid-cols-[1.3fr_1fr_1.2fr_1.2fr_0.9fr_auto]"
                  )}
                >
                  <div>Order Request</div>
                  <div>Client PO</div>
                  {showVendorColumn && <div>Vendor</div>}
                  <div>Date Created</div>
                  <div>Deadline</div>
                  <div>Status</div>
                  <div className="text-center">Action</div>
                </div>

                <div className="divide-y divide-border">
                  {visibleOrders.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-foreground">No order requests found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try a different vendor name, order ID, or client PO.</p>
                    </div>
                  ) : (
                    visibleOrders.map((order, index) => {
                      const tone = getOrderTone(order);
                      const deadlineInfo = getDeadlineInfo(order.deadline);

                      return (
                        <div
                          key={order.id}
                          className={cn(
                            "relative grid gap-4 px-5 py-4 items-center transition-colors group animate-in-smart",
                            showVendorColumn ? "grid-cols-[1.2fr_1fr_1.7fr_0.9fr_1.1fr_0.85fr_auto]" : "grid-cols-[1.3fr_1fr_1.2fr_1.2fr_0.9fr_auto]",
                            tone === "warning" && "bg-warning/10 hover:bg-warning/15",
                            tone === "danger" && "bg-destructive/10 hover:bg-destructive/15",
                            tone === "default" && "hover:bg-accent/10"
                          )}
                          style={{ animationDelay: `${150 + (index * 20)}ms` }}
                        >
                          <div className="min-w-0">
                            <Link to={detailPath(order.id)} className="block text-xs font-mono font-bold text-primary hover:underline underline-offset-4 truncate">
                              {order.id}
                            </Link>
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{order.clientPO}</p>
                          </div>

                          {showVendorColumn && (
                            <div className="min-w-0">
                              <p className={cn("text-xs font-medium truncate", order.supplier === "Pending" ? "text-destructive italic" : "text-foreground")}>
                                {order.supplier}
                              </p>
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-foreground">
                              <span className="truncate">{formatCreatedDate(order.createdDate)}</span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <span className={cn("truncate", deadlineInfo.isOverdue ? "text-destructive font-bold" : deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 ? "text-warning font-bold" : "text-foreground")}>
                                {deadlineInfo.label}
                              </span>
                            </div>
                          </div>

                          <div>
                            <StatusBadge status={order.status} className="whitespace-nowrap" />
                          </div>

                          <div className="flex items-center justify-center">
                            <div className="relative">
                              <button
                                data-order-action-button
                                onClick={() => setOpenActionMenuId((current) => current === order.id ? null : order.id)}
                                className="p-1.5 hover:bg-white/70 rounded-md transition-colors btn-press"
                                aria-haspopup="menu"
                                aria-expanded={openActionMenuId === order.id}
                                aria-label={`Open actions for ${order.id}`}
                              >
                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              </button>

                              {openActionMenuId === order.id && (
                                <div
                                  data-order-action-menu
                                  className="absolute right-0 top-full mt-2 w-44 rounded-md border border-border bg-white shadow-lg z-20 overflow-hidden"
                                >
                                  <button
                                    onClick={() => {
                                      navigate(detailPath(order.id));
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-accent transition-colors"
                                  >
                                    View details
                                  </button>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(order.id);
                                      } catch {
                                        // Clipboard access can fail in some environments; the action still closes cleanly.
                                      }
                                      setOpenActionMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-accent transition-colors"
                                  >
                                    Copy order ID
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-accent/5">
              <p className="text-[11px] text-muted-foreground">
                Showing <span className="font-bold text-foreground">{visibleOrders.length}</span> of <span className="font-bold text-foreground">{orders.length}</span> orders
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground mr-2">
                  Page <span className="font-bold text-foreground">{currentPage}</span> of <span className="font-bold text-foreground">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-border rounded text-[10px] font-bold text-muted-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-3 py-1 bg-white border border-border rounded text-[10px] font-bold text-primary hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function formatCreatedDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDeadlineInfo(deadline: string) {
  const normalized = deadline.trim().toLowerCase();
  const daysLeftMatch = normalized.match(/(\d+)/);
  const daysLeft = daysLeftMatch ? Number(daysLeftMatch[1]) : null;
  const isOverdue = normalized.includes("overdue") || normalized.includes("melewati");
  const isFinished = normalized.includes("finished") || normalized.includes("selesai");

  if (isOverdue) {
    return {
      daysLeft: 0,
      isOverdue: true,
      label: deadline,
      hint: "Lewat deadline",
    };
  }

  if (daysLeft !== null) {
    return {
      daysLeft,
      isOverdue: false,
      label: deadline.toLowerCase().includes("days") ? deadline : `${daysLeft} hari lagi`,
      hint: `${daysLeft} hari lagi`,
    };
  }

  if (isFinished) {
    return {
      daysLeft: null,
      isOverdue: false,
      label: deadline,
      hint: "Order sudah selesai",
    };
  }

  return {
    daysLeft: null,
    isOverdue: false,
    label: deadline,
    hint: null,
  };
}

function getOrderTone(order: { status: any; deadline: string; createdDate: string; items: Array<{ status: string }> }) {
  const createdDate = new Date(`${order.createdDate}T00:00:00`);
  const createdAge = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const deadlineInfo = getDeadlineInfo(order.deadline);
  const baseStatus = getBaseOrderStatus(order.status);
  const productionNotStarted = baseStatus === "Created" || baseStatus === "Waiting";
  const hasUnfinishedItems = order.items.some((item) => item.status !== "Completed" && item.status !== "Delivered");

  if (deadlineInfo.isOverdue) {
    return "danger";
  }

  if (productionNotStarted && createdAge >= 7) {
    return "danger";
  }

  if ((deadlineInfo.daysLeft !== null && deadlineInfo.daysLeft <= 3 && hasUnfinishedItems) || (productionNotStarted && createdAge >= 3)) {
    return "warning";
  }

  return "default";
}
