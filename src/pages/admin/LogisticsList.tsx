import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Truck, MapPin, Package, MoreVertical, Search, Filter } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export function LogisticsList() {
  const shipments = [
    { id: "SHP-001", order: "OR-2026-816972", dest: "WH055 · Jakarta Barat", weight: "375.0 kg", status: "On Delivery" },
    { id: "SHP-002", order: "OR-2026-715187", dest: "WH020 · Medan 1", weight: "250.0 kg", status: "Ready to Ship" },
    { id: "SHP-003", order: "OR-2026-901234", dest: "WH012 · Surabaya", weight: "120.0 kg", status: "Delivered" },
  ];

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Logistics & Shipments" />
        
        <main className="p-8 space-y-6">
          <section className="flex items-center justify-between animate-in-smart">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search shipments by ID or Order..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-md text-xs font-bold hover:bg-accent transition-colors btn-press">
                <Filter className="w-3.5 h-3.5" />
                Filter Carriers
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md">
                Create Shipment
              </button>
            </div>
          </section>

          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <th className="px-6 py-4">Shipment ID</th>
                    <th className="px-6 py-4">Source Order</th>
                    <th className="px-6 py-4">Destination</th>
                    <th className="px-6 py-4">Total Weight</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shipments.map((shp, index) => (
                    <tr 
                      key={shp.id} 
                      className="hover:bg-accent/10 transition-colors group animate-in-smart"
                      style={{ animationDelay: `${150 + (index * 20)}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-mono font-bold">{shp.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-primary hover:underline cursor-pointer">{shp.order}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <MapPin className="w-3 h-3" />
                          {shp.dest}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        {shp.weight}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={shp.status as any} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
