import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users, 
  Tag, 
  Factory,
  Bookmark,
  Map,
  Settings,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  Mail,
  Inbox
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export type UserRole = 'admin' | 'operator' | 'analyst' | 'customer' | 'vendor';

interface SidebarProps {
  role: UserRole;
  className?: string;
}

const navItems: Record<UserRole, any[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: PlusCircle, label: "Create OR", path: "/admin/create" },
    { icon: Package, label: "Order Progress", path: "/admin/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/admin/orders" },
    { icon: Inbox, label: "Dispatch Imports", path: "/admin/imports" },
    { icon: Mail, label: "Inbox", path: "/admin/inbox" },
    { icon: Truck, label: "Logistics", path: "/admin/logistics" },
    { icon: Factory, label: "Suppliers", path: "/admin/suppliers" },
    { icon: Tag, label: "Products", path: "/admin/products" },
    { icon: Bookmark, label: "Brands", path: "/admin/brands" },
    { icon: Map, label: "Sales Points", path: "/admin/sales-points" },
    { icon: Users, label: "Users", path: "/admin/users" },
  ],
  operator: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/operator" },
    { icon: PlusCircle, label: "Create OR", path: "/operator/create" },
    { icon: Package, label: "Order Progress", path: "/operator/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/operator/orders" },
    { icon: Inbox, label: "Dispatch Imports", path: "/operator/imports" },
    { icon: Mail, label: "Inbox", path: "/operator/inbox" },
  ],
  analyst: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/analyst" },
    { icon: Package, label: "Order Progress", path: "/analyst/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/analyst/orders" },
    { icon: Mail, label: "Inbox", path: "/analyst/inbox" },
    { icon: Users, label: "Users", path: "/analyst/users" },
  ],
  customer: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/customer" },
    { icon: Package, label: "Order Progress", path: "/customer/progress" },
    { icon: PlusCircle, label: "Create OR", path: "/customer/create" },
    { icon: Inbox, label: "PO Imports", path: "/customer/imports" },
    { icon: Mail, label: "Inbox", path: "/customer/inbox" },
    { icon: ShoppingCart, label: "My Orders", path: "/customer/orders" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
    { icon: Package, label: "Order Progress", path: "/vendor/progress" },
    { icon: ShoppingCart, label: "My Orders", path: "/vendor/orders" },
    { icon: Mail, label: "Inbox", path: "/vendor/inbox" },
    { icon: Users, label: "My Profile", path: "/vendor/profile" },
  ]
};

export function Sidebar({ role, className }: SidebarProps) {
  const location = useLocation();
  const items = navItems[role];

  return (
    <div className={cn("flex flex-col w-64 bg-white border-r border-border h-screen sticky top-0", className)}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold">V</div>
          <span className="text-xl font-bold tracking-tight">VA Trace</span>
        </div>

        <nav className="space-y-1">
          {items.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md transition-all duration-200 group btn-press",
                  "animate-in-smart",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="bg-accent/50 p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
            <ShieldCheck className="w-3 h-3" />
            Role Switcher
          </div>
          <div className="grid grid-cols-5 gap-1">
            <Link to="/admin" title="Admin" className="text-[9px] font-bold p-1 bg-white border border-border rounded text-center hover:bg-primary hover:text-white transition-colors">ADM</Link>
            <Link to="/operator" title="Operator" className="text-[9px] font-bold p-1 bg-white border border-border rounded text-center hover:bg-primary hover:text-white transition-colors">OPR</Link>
            <Link to="/analyst" title="Analyst" className="text-[9px] font-bold p-1 bg-white border border-border rounded text-center hover:bg-primary hover:text-white transition-colors">ANA</Link>
            <Link to="/customer" title="Customer" className="text-[9px] font-bold p-1 bg-white border border-border rounded text-center hover:bg-primary hover:text-white transition-colors">CUS</Link>
            <Link to="/vendor" title="Vendor" className="text-[9px] font-bold p-1 bg-white border border-border rounded text-center hover:bg-primary hover:text-white transition-colors">VND</Link>
          </div>
        </div>

        <button className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium w-full px-3">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
