import { Sidebar, UserRole } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { useOrders } from "@/lib/orderStore";

interface AdminDashboardProps {
  role?: UserRole;
}

export function AdminDashboard({ role = "admin" }: AdminDashboardProps) {
  const orders = useOrders();
  const getHeaderTitle = () => {
    switch(role) {
      case 'analyst': return "Insights & Reports";
      case 'operator': return "Order Management";
      default: return "Procurement Dashboard";
    }
  };

  const metrics = [
    { label: "Active Orders", value: `${orders.filter((order) => order.status !== "Completed").length}`, change: "Live order count", color: "text-primary" },
    { label: "Urgent Orders", value: `${orders.filter((order) => order.deadline.includes("3 days") || order.deadline === "Overdue").length}`, change: "Deadline <= 3 days", color: "text-destructive" },
    { label: "Completed", value: `${orders.filter((order) => order.status === "Completed").length}`, change: "Current finished orders", color: "text-success" },
    { label: "Work Volume This Month", value: `${orders.reduce((total, order) => total + getOrderQuantity(order), 0)}`, change: "Ordered quantity total", color: "text-primary" },
  ];

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={getHeaderTitle()} />
        
        <main className="p-8 space-y-8">
          {/* Metrics Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <div 
                key={metric.label}
                className="bg-white p-6 rounded-lg border border-border animate-in-smart group hover:border-primary/50 transition-colors"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className={`text-2xl font-bold tracking-tight ${metric.color}`}>{metric.value}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{metric.change}</p>
              </div>
            ))}
          </section>

          {/* Recent Orders Table */}
          <section className="bg-white rounded-lg border border-border overflow-hidden animate-in-smart" style={{ animationDelay: '250ms' }}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight">Recent Orders</h2>
                <p className="text-xs text-muted-foreground mt-1">Overview of latest procurement activities</p>
              </div>
              <button className="text-xs font-bold text-primary hover:underline btn-press">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="px-6 py-3">Order ID</th>
                    <th className="px-6 py-3">Campaign Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created Date</th>
                    <th className="px-6 py-3">Deadline</th>
                    <th className="px-6 py-3 text-right">Total Qty</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-accent/20 transition-colors group animate-in-smart"
                      style={{ animationDelay: `${300 + (index * 30)}ms` }}
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold">{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium">{order.campaign}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-muted-foreground">{order.createdDate}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-medium ${order.deadline === 'Overdue' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {order.deadline}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-bold">{getOrderQuantity(order)} Qty</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
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

function getOrderQuantity(order: { items: Array<{ quantity: number }> }) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}
