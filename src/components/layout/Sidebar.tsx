import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  PlusCircle,
  ChevronRight,
  Mail,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export type UserRole = "admin" | "operator" | "analyst" | "customer" | "vendor";

interface SidebarProps {
  role: UserRole;
  className?: string;
}

export interface SidebarNavItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const navItems: Record<UserRole, SidebarNavItem[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: PlusCircle, label: "Create OR", path: "/admin/create" },
    { icon: Package, label: "Order Progress", path: "/admin/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/admin/orders" },
    { icon: Package, label: "Imports", path: "/admin/imports" },
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
    { icon: Package, label: "Imports", path: "/customer/imports" },
    { icon: Mail, label: "Inbox", path: "/customer/inbox" },
    { icon: ShoppingCart, label: "My Orders", path: "/customer/orders" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
    { icon: Package, label: "Order Progress", path: "/vendor/progress" },
    { icon: ShoppingCart, label: "My Orders", path: "/vendor/orders" },
    { icon: Mail, label: "Inbox", path: "/vendor/inbox" },
    { icon: Users, label: "My Profile", path: "/vendor/profile" },
  ],
};

export function getNavItemsForRole(role: UserRole) {
  return navItems[role];
}

export function Sidebar({ role, className }: SidebarProps) {
  const location = useLocation();
  const items = navItems[role];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r bg-card/95 px-4 py-5 backdrop-blur lg:flex",
        className,
      )}
    >
      <div className="flex items-center gap-3 px-2">
        <Avatar className="h-10 w-10 rounded-xl">
          <AvatarFallback className="rounded-xl bg-primary text-primary-foreground">V</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none tracking-tight">VA Trace</p>
          <p className="mt-1 text-xs text-muted-foreground">Procurement workspace</p>
        </div>
      </div>

      <Separator className="my-5" />

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "h-11 w-full justify-start gap-3 px-3",
                isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground",
              )}
            >
              <Link to={item.path} aria-current={isActive ? "page" : undefined}>
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                {isActive ? <ChevronRight className="h-4 w-4" /> : null}
              </Link>
            </Button>
          );
        })}
      </nav>

    </aside>
  );
}
