import { useState } from 'react';
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockOrders } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { 
  Inbox, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

type VendorTab = 'Pending' | 'Production' | 'Shipping' | 'History';

export function VendorDashboard() {
  const [activeTab, setActiveTab] = useState<VendorTab>('Production');

  const tabs: VendorTab[] = ['Pending', 'Production', 'Shipping', 'History'];

  const metrics = [
    { label: "Pending", value: "02", color: "text-warning" },
    { label: "Production", value: "08", color: "text-processing" },
    { label: "Ready", value: "03", color: "text-primary" },
    { label: "Shipping", value: "01", color: "text-processing" },
    { label: "Completed", value: "124", color: "text-success" },
  ];

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role="vendor" />
      <div className="flex-1">
        <Header title="Vendor Dashboard" />
        
        <main className="p-8 space-y-8 max-w-7xl mx-auto">
          {/* Inbox Notification */}
          <section className="bg-primary p-4 rounded-lg flex items-center justify-between animate-in-smart shadow-lg shadow-primary/20">
            <div className="flex items-center gap-4 text-white">
              <div className="p-2 bg-white/20 rounded-md">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Inbox Order</h3>
                <p className="text-xs opacity-90 font-medium">1 order is awaiting your confirmation</p>
              </div>
            </div>
            <button className="px-4 py-1.5 bg-white text-primary rounded-md text-[10px] font-bold uppercase tracking-wider btn-press">
              Review Now
            </button>
          </section>

          {/* Pipeline Metrics */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.map((metric, index) => (
              <div 
                key={metric.label}
                className="bg-white p-4 rounded-lg border border-border shadow-sm animate-in-smart group hover:border-primary/30 transition-colors"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{metric.label}</p>
                <h3 className={cn("text-2xl font-bold mt-2", metric.color)}>{metric.value}</h3>
              </div>
            ))}
          </section>

          {/* Tabbed Order List */}
          <section className="space-y-4 animate-in-smart" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center gap-1 border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 py-3 text-xs font-bold transition-all relative",
                    activeTab === tab 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in-smart" style={{ transformOrigin: 'left' }} />
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {mockOrders.slice(0, 3).map((order, index) => (
                <VendorOrderCard key={order.id} order={order} index={index} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function VendorOrderCard({ order, index }: { order: any, index: number }) {
  return (
    <div 
      className="bg-white rounded-lg border border-border shadow-sm p-6 hover:border-primary/20 transition-all group animate-in-smart"
      style={{ animationDelay: `${300 + (index * 50)}ms` }}
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-primary">{order.id}</span>
                <StatusBadge status={order.status} />
                {order.status === 'Overdue' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-destructive uppercase animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    Overdue
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold tracking-tight">{order.campaign}</h3>
            </div>
            <button className="p-2 hover:bg-accent rounded-md transition-colors btn-press">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Created: {order.createdDate}</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-xs font-bold",
              order.deadline === 'Overdue' ? 'text-destructive' : 'text-muted-foreground'
            )}>
              <Clock className="w-3.5 h-3.5" />
              <span>Deadline: {order.deadline}</span>
            </div>
          </div>

          <div className="bg-accent/30 p-3 rounded-md border border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Notes</p>
            <p className="text-xs text-muted-foreground italic truncate">"Please wrap in bubble wrap as per requested..."</p>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Itemized Progress</h4>
          <div className="space-y-3">
            <ProgressRow label="Production" current={200} total={750} color="bg-primary" />
            <ProgressRow label="Ready to Ship" current={100} total={750} color="bg-processing" />
            <ProgressRow label="On Delivery" current={100} total={750} color="bg-processing" />
            <ProgressRow label="Delivered" current={100} total={750} color="bg-success" />
          </div>
          <Link 
            to={`/vendor/update/${order.id}`}
            className="block w-full text-center mt-2 py-2 bg-white border border-border text-primary rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all btn-press"
          >
            Update Progress
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const percentage = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
        <span>{label}</span>
        <span>{current}/{total}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn("h-full rounded-full transition-all duration-700 ease-out-expo", color)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
