import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertCircle, Clock, Package, Truck, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useOrders } from "@/lib/orderStore";

export function ClientDashboard() {
  const orders = useOrders();
  const metrics = [
    { label: "WAITING", value: "05", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "IN PRODUCTION", value: "12", icon: Package, color: "text-processing", bg: "bg-processing/10" },
    { label: "DELIVERY", value: "03", icon: Truck, color: "text-primary", bg: "bg-primary/10" },
    { label: "COMPLETED", value: "48", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="customer" />
      <div className="flex-1">
        <Header title="Customer Dashboard" />
        
        <main className="p-8 space-y-8 max-w-7xl mx-auto">
          {/* Read-Only Notice (as per design docs) */}
          <section className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-start gap-3 animate-in-smart">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-primary">Customer Viewer</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Upload bulk PO workbooks here so operations can stage them for vendor dispatch. Order assignment and dispatch happen in the internal workspace.
              </p>
              <Link to="/customer/imports" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                Open PO import upload <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </section>

          {/* Metrics Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <div 
                key={metric.label}
                className="bg-white p-6 rounded-lg border border-border shadow-sm animate-in-smart group hover:border-primary/50 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className={cn("p-2 rounded-md", metric.bg)}>
                    <metric.icon className={cn("w-4 h-4", metric.color)} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{metric.label}</span>
                </div>
                <h3 className="text-3xl font-bold tracking-tighter">{metric.value}</h3>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Overview by PO Table */}
            <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '250ms' }}>
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight">Overview by Customer Ref PO</h2>
                <button className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 group">
                  View All <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-accent/30 text-[9px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                      <th className="px-5 py-3 text-foreground">Customer PO Ref</th>
                      <th className="px-5 py-3 text-center">WT</th>
                      <th className="px-5 py-3 text-center">PR</th>
                      <th className="px-5 py-3 text-center">DL</th>
                      <th className="px-5 py-3 text-center">CP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.slice(0, 4).map((order) => (
                      <tr key={order.clientPO} className="hover:bg-accent/10 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono font-bold text-muted-foreground">{order.clientPO}</td>
                        <td className="px-5 py-4 text-center text-xs">1</td>
                        <td className="px-5 py-4 text-center text-xs">0</td>
                        <td className="px-5 py-4 text-center text-xs">0</td>
                        <td className="px-5 py-4 text-center text-xs">0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Breakdown by Zone Table */}
            <section className="bg-white rounded-lg border border-border shadow-sm overflow-hidden animate-in-smart" style={{ animationDelay: '350ms' }}>
              <div className="p-5 border-b border-border">
                <h2 className="text-sm font-bold tracking-tight">Breakdown by Zone</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-accent/30 text-[9px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                      <th className="px-5 py-3 text-foreground">Zone</th>
                      <th className="px-5 py-3 text-center">WT</th>
                      <th className="px-5 py-3 text-center">PR</th>
                      <th className="px-5 py-3 text-center">DL</th>
                      <th className="px-5 py-3 text-center">CP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {['Jakarta', 'North Sumatera', 'South Sumatera', 'West Java'].map((zone) => (
                      <tr key={zone} className="hover:bg-accent/10 transition-colors">
                        <td className="px-5 py-4 text-xs font-medium">{zone}</td>
                        <td className="px-5 py-4 text-center text-xs">5</td>
                        <td className="px-5 py-4 text-center text-xs">3</td>
                        <td className="px-5 py-4 text-center text-xs">2</td>
                        <td className="px-5 py-4 text-center text-xs">10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
