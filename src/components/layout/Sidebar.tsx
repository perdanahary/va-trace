import { createContext, useCallback, useContext, useMemo, useState, type ComponentType, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
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
import pmgAsiaLogo from "@/assets/pmg-asia-logo.jpeg";

export type UserRole = "admin" | "operator" | "analyst" | "client" | "vendor";

interface SidebarVisibilityContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const SidebarVisibilityContext = createContext<SidebarVisibilityContextValue | null>(null);

const defaultSidebarVisibilityState: SidebarVisibilityContextValue = {
  open: true,
  setOpen: () => {},
  toggle: () => {},
};

interface SidebarProps {
  role: UserRole;
  className?: string;
  compact?: boolean;
}

interface SidebarVisibilityProviderProps {
  children: ReactNode;
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
    { icon: Package, label: "Order Tracking", path: "/admin/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/admin/orders" },
    { icon: Package, label: "Imports", path: "/admin/imports" },
    { icon: Mail, label: "Inbox", path: "/admin/inbox" },
    { icon: Factory, label: "Suppliers", path: "/admin/suppliers" },
    { icon: Tag, label: "Products", path: "/admin/products" },
    { icon: Bookmark, label: "Brands", path: "/admin/brands" },
    { icon: Map, label: "Sales Points", path: "/admin/sales-points" },
    { icon: Users, label: "Clients", path: "/admin/clients" },
    { icon: Users, label: "Users", path: "/admin/users" },
  ],
  operator: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/operator" },
    { icon: PlusCircle, label: "Create OR", path: "/operator/create" },
    { icon: Package, label: "Order Tracking", path: "/operator/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/operator/orders" },
    { icon: Mail, label: "Inbox", path: "/operator/inbox" },
  ],
  analyst: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/analyst" },
    { icon: Package, label: "Order Tracking", path: "/analyst/progress" },
    { icon: ShoppingCart, label: "All Orders", path: "/analyst/orders" },
    { icon: Mail, label: "Inbox", path: "/analyst/inbox" },
    { icon: Users, label: "Users", path: "/analyst/users" },
  ],
  client: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/client" },
    { icon: Package, label: "Order Tracking", path: "/client/progress" },
    { icon: PlusCircle, label: "Create OR", path: "/client/create" },
    { icon: Package, label: "Imports", path: "/client/imports" },
    { icon: Mail, label: "Inbox", path: "/client/inbox" },
    { icon: ShoppingCart, label: "My Orders", path: "/client/orders" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
    { icon: Package, label: "Order Tracking", path: "/vendor/progress" },
    { icon: ShoppingCart, label: "My Orders", path: "/vendor/orders" },
    { icon: Mail, label: "Inbox", path: "/vendor/inbox" },
    { icon: Users, label: "My Profile", path: "/vendor/profile" },
  ],
};

export function getNavItemsForRole(role: UserRole) {
  return navItems[role];
}

export function SidebarVisibilityProvider({ children }: SidebarVisibilityProviderProps) {
  const [open, setOpen] = useState(true);
  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
    }),
    [open, toggle],
  );

  return <SidebarVisibilityContext.Provider value={value}>{children}</SidebarVisibilityContext.Provider>;
}

export function useSidebarVisibility() {
  return useContext(SidebarVisibilityContext) ?? defaultSidebarVisibilityState;
}

export function Sidebar({ role, className, compact = false }: SidebarProps) {
  const location = useLocation();
  const { open } = useSidebarVisibility();
  const items = navItems[role];
  const homePath = items[0]?.path ?? `/${role}`;

  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        compact
          ? "fixed top-0 left-0 z-30 hidden h-screen w-24 flex-col border-r bg-card/95 px-3 py-5 backdrop-blur lg:flex"
          : "fixed top-0 left-0 z-30 hidden h-screen w-60 flex-col border-r bg-card/95 px-4 py-5 backdrop-blur lg:flex",
        className,
      )}
    >
      <Link
        to={homePath}
        className={cn(
          "flex items-center rounded-2xl px-2 transition-colors hover:bg-accent/50",
          compact ? "justify-center gap-0" : "gap-3",
        )}
        aria-label="Go to dashboard"
      >
        <img src={pmgAsiaLogo} alt="PMG Asia" className="h-10 w-10 object-cover" />
        {!compact ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none tracking-tight">VA Trace</p>
            <p className="mt-1 text-xs text-muted-foreground">workspace</p>
          </div>
        ) : null}
      </Link>

      {!compact ? (
        <>
          <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
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
        </>
      ) : (
        <div className="my-4 flex-1" />
      )}
      <UserAccountMenu
        role={role}
        compact={compact}
        className="h-auto w-full rounded-2xl border border-border/70 bg-background px-3 py-3 hover:bg-accent/40"
        contentClassName={compact ? "w-72" : "w-72"}
      />
    </aside>
  );
}
