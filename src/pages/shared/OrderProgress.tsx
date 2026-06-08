import { Sidebar, UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockOrders } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { Truck, Package, Clock, CheckCircle2 } from "lucide-react";

interface OrderProgressProps {
  role: UserRole;
}

export function OrderProgress({ role }: OrderProgressProps) {
  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={`${role.toUpperCase()} - Order Progress Tracking`} />
        
        <main className="p-8 space-y-8 max-w-7xl mx-auto">
          {/* Progress Overview Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ProgressMetric label="In Production" value="12" icon={Package} color="text-processing" />
            <ProgressMetric label="Ready to Ship" value="08" icon={Clock} color="text-primary" />
            <ProgressMetric label="On Delivery" value="04" icon={Truck} color="text-processing" />
            <ProgressMetric label="Completed" value="124" icon={CheckCircle2} color="text-success" />
          </section>

          {/* Detailed Progress List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2 animate-in-smart">
              <h2 className="text-sm font-bold tracking-tight uppercase tracking-widest text-muted-foreground text-[10px]">Ongoing Order Progress</h2>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-[10px] font-bold text-primary">Live Tracking Enabled</span>
              </div>
            </div>

            <div className="space-y-4">
              {mockOrders.slice(0, 4).map((order, index) => (
                <div 
                  key={order.id}
                  className="bg-white rounded-lg border border-border shadow-sm p-6 animate-in-smart hover:border-primary/20 transition-all group"
                  style={{ animationDelay: `${100 + (index * 40)}ms` }}
                >
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Order Info */}
                    <div className="lg:w-1/4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary">{order.id}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <h3 className="text-sm font-bold tracking-tight">{order.campaign}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{order.supplier}</p>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                      <MiniProgress label="Production" current={750} total={750} isDone />
                      <MiniProgress label="Ready" current={400} total={750} isActive />
                      <MiniProgress label="Shipping" current={150} total={750} />
                      <MiniProgress label="Delivered" current={0} total={750} />
                    </div>

                    {/* Meta/Action */}
                    <div className="lg:w-1/6 flex flex-col justify-center items-end border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Next Milestone</p>
                      <p className="text-xs font-bold text-foreground mt-1">Shipment Pick-up</p>
                      <p className="text-[10px] text-destructive font-medium mt-1">2 days left</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProgressMetric({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-border shadow-sm animate-in-smart flex items-center gap-4">
      <div className={cn("p-2.5 rounded-md bg-slate-50 border border-border", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-bold tracking-tighter mt-0.5">{value}</h3>
      </div>
    </div>
  );
}

function MiniProgress({ label, current, total, isDone = false, isActive = false }: { label: string, current: number, total: number, isDone?: boolean, isActive?: boolean }) {
  const percentage = (current / total) * 100;
  return (
    <div className={cn("space-y-2", !isDone && !isActive && "opacity-40")}>
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
        <span className={cn(isDone && "text-success", isActive && "text-primary")}>{label}</span>
        <span className="text-muted-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out-expo",
            isDone ? "bg-success" : (isActive ? "bg-primary animate-pulse" : "bg-slate-300")
          )}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
