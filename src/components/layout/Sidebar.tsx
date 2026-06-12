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
  Truck,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Tags,
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
  userRole: UserRole;
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

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

type NavEntry = SidebarNavItem | SidebarNavGroup;

const navItems: Record<UserRole, NavEntry[]> = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    {
      label: "Orders",
      items: [
        { icon: ShoppingCart, label: "All Orders", path: "/admin/orders" },
        { icon: Package, label: "Order Tracking", path: "/admin/progress" },
        { icon: PlusCircle, label: "Create OR", path: "/admin/create" },
        { icon: Package, label: "Imports", path: "/admin/imports" },
      ],
    },
    {
      label: "Logistics",
      items: [
        { icon: Factory, label: "Production", path: "/admin/production" },
        { icon: Truck, label: "Shipment Batches", path: "/admin/shipments" },
        { icon: FileText, label: "Delivery Notes", path: "/admin/delivery-notes" },
        { icon: Tags, label: "Shipping Labels", path: "/admin/labels" },
        { icon: ClipboardCheck, label: "POD Verification", path: "/admin/pod" },
        { icon: AlertTriangle, label: "Exceptions", path: "/admin/exceptions" },
      ],
    },
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
    {
      label: "Orders",
      items: [
        { icon: ShoppingCart, label: "All Orders", path: "/operator/orders" },
        { icon: Package, label: "Order Tracking", path: "/operator/progress" },
        { icon: PlusCircle, label: "Create OR", path: "/operator/create" },
      ],
    },
    {
      label: "Logistics",
      items: [
        { icon: Factory, label: "Production", path: "/operator/production" },
        { icon: Truck, label: "Shipment Batches", path: "/operator/shipments" },
        { icon: FileText, label: "Delivery Notes", path: "/operator/delivery-notes" },
      ],
    },
    { icon: Mail, label: "Inbox", path: "/operator/inbox" },
  ],
  analyst: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/analyst" },
    {
      label: "Orders",
      items: [
        { icon: ShoppingCart, label: "All Orders", path: "/analyst/orders" },
        { icon: Package, label: "Order Tracking", path: "/analyst/progress" },
      ],
    },
    { icon: Mail, label: "Inbox", path: "/analyst/inbox" },
    { icon: Users, label: "Users", path: "/analyst/users" },
  ],
  client: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/client" },
    {
      label: "Orders",
      items: [
        { icon: ShoppingCart, label: "My Orders", path: "/client/orders" },
        { icon: Package, label: "Order Tracking", path: "/client/progress" },
        { icon: PlusCircle, label: "Create OR", path: "/client/create" },
        { icon: Package, label: "Imports", path: "/client/imports" },
      ],
    },
    { icon: Mail, label: "Inbox", path: "/client/inbox" },
  ],
  vendor: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/vendor" },
    {
      label: "Orders",
      items: [
        { icon: ShoppingCart, label: "My Orders", path: "/vendor/orders" },
        { icon: Package, label: "Order Tracking", path: "/vendor/progress" },
        { icon: Factory, label: "Production", path: "/vendor/production" },
      ],
    },
    {
      label: "Logistics",
      items: [
        { icon: Truck, label: "Shipment Batches", path: "/vendor/shipments" },
        { icon: FileText, label: "Delivery Notes", path: "/vendor/delivery-notes" },
        { icon: ClipboardCheck, label: "POD Uploads", path: "/vendor/pod" },
      ],
    },
    { icon: Mail, label: "Inbox", path: "/vendor/inbox" },
    { icon: Users, label: "My Profile", path: "/vendor/profile" },
  ],
};

export function getNavItemsForRole(role: UserRole): SidebarNavItem[] {
  return navItems[role].flatMap((entry) => ("items" in entry ? entry.items : [entry]));
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

export function Sidebar({ userRole, className, compact = false }: SidebarProps) {
  const location = useLocation();
  const { open } = useSidebarVisibility();
  const items = navItems[userRole];
  const firstEntry = items[0];
  const homePath = firstEntry && "path" in firstEntry ? firstEntry.path : `/${userRole}`;

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
            {items.map((entry) => {
              if ("items" in entry) {
                return (
                  <div key={entry.label} className="space-y-1 pt-2 pb-2">
                    <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                      {entry.label}
                    </p>
                    {entry.items.map((subItem) => {
                      const isActive = location.pathname === subItem.path;
                      return (
                        <Button
                          key={subItem.path}
                          asChild
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "h-11 w-full justify-start gap-3 px-3",
                            isActive ? "bg-muted/70 text-foreground hover:bg-muted/80" : "text-muted-foreground",
                          )}
                        >
                          <Link to={subItem.path} aria-current={isActive ? "page" : undefined}>
                            <subItem.icon className={cn("h-4 w-4", isActive ? "text-warning" : "text-current")} />
                            <span className="flex-1 text-left text-sm font-medium">{subItem.label}</span>
                            {isActive ? <ChevronRight className="h-4 w-4 text-warning" /> : null}
                          </Link>
                        </Button>
                      );
                    })}
                  </div>
                );
              }
              const isActive = location.pathname === entry.path;
              return (
              <Button
                  key={entry.path}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "h-11 w-full justify-start gap-3 px-3",
                    isActive ? "bg-muted/70 text-foreground hover:bg-muted/80" : "text-muted-foreground",
                  )}
                >
                  <Link to={entry.path} aria-current={isActive ? "page" : undefined}>
                    <entry.icon className={cn("h-4 w-4", isActive ? "text-warning" : "text-current")} />
                    <span className="flex-1 text-left text-sm font-medium">{entry.label}</span>
                    {isActive ? <ChevronRight className="h-4 w-4 text-warning" /> : null}
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
        userRole={userRole}
        compact={compact}
        className="h-auto w-full rounded-2xl border border-border/70 bg-background px-3 py-3 hover:bg-accent/40"
        contentClassName={compact ? "w-72" : "w-72"}
      />
    </aside>
  );
}
