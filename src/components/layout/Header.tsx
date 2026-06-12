import { Fragment, type ReactNode } from "react";
import { Menu, PanelLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getNavItemsForRole, type UserRole, useSidebarVisibility } from "@/components/layout/Sidebar";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";

interface HeaderBreadcrumbItem {
  label: string;
  to?: string;
}

interface HeaderProps {
  title: string;
  className?: string;
  startActions?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: HeaderBreadcrumbItem[];
  showMobileMenu?: boolean;
}

const segmentLabelMap: Record<string, string> = {
  create: "Create OR",
  progress: "Order Progress",
  orders: "All Orders",
  "delivery-note": "Delivery Note",
  "packaging-labels": "Packaging Labels",
  imports: "Imports",
  inbox: "Inbox",
  users: "Users",
  logistics: "Logistics",
  suppliers: "Suppliers",
  products: "Products",
  brands: "Brands",
  "sales-points": "Sales Points",
  update: "Update Progress",
  profile: "My Profile",
};

export function Header({ title, className, startActions, actions, breadcrumbs, showMobileMenu = true }: HeaderProps) {
  const location = useLocation();
  const { open: sidebarOpen, toggle: toggleSidebar } = useSidebarVisibility();
  const currentRole = (location.pathname.split("/")[1] || "admin") as UserRole;
  const navItems = getNavItemsForRole(currentRole);
  const resolvedBreadcrumbs = breadcrumbs ?? buildBreadcrumbs(location.pathname, title, currentRole, navItems);

  return (
    <header className={cn("sticky top-0 z-20 border-b bg-background/95 backdrop-blur", className)}>
      <div className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {showMobileMenu ? (
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[300px] flex-col">
                <SheetHeader className="text-left">
                  <SheetTitle>VA Trace</SheetTitle>
                </SheetHeader>
                <Separator className="my-4" />
                <nav className="flex-1 space-y-1">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Button
                        key={item.path}
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className={cn("w-full justify-start gap-3 px-3", isActive && "bg-primary text-primary-foreground hover:bg-primary/90")}
                      >
                        <Link to={item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </Button>
                    );
                  })}
                </nav>
                <Separator className="my-4" />
                <UserAccountMenu
                  userRole={currentRole}
                  className="h-auto w-full rounded-2xl border border-border/70 bg-background px-3 py-3 hover:bg-accent/40"
                  contentClassName="w-72"
                />
              </SheetContent>
            </Sheet>
          </div>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          onClick={toggleSidebar}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {startActions ? <div className="flex items-center gap-2">{startActions}</div> : null}

        <div className="min-w-0 flex-1">
          <Breadcrumb>
            <BreadcrumbList className="gap-y-1 text-sm">
              {resolvedBreadcrumbs.map((item, index) => {
                const isLast = index === resolvedBreadcrumbs.length - 1;

                return (
                  <Fragment key={`${item.label}-${index}`}>
                    <BreadcrumbItem>
                      {item.to && !isLast ? (
                        <BreadcrumbLink asChild>
                          <Link to={item.to}>{item.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="font-medium">{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}

function buildBreadcrumbs(
  pathname: string,
  title: string,
  role: UserRole,
  navItems: ReturnType<typeof getNavItemsForRole>,
): HeaderBreadcrumbItem[] {
  const navBySegment = new Map(navItems.map((item) => [item.path.split("/")[2], item.label]));
  const segments = pathname.split("/").filter(Boolean);
  const contentSegments = segments.slice(1);
  const crumbs: HeaderBreadcrumbItem[] = [];
  let currentPath = `/${role}`;

  contentSegments.forEach((segment, index) => {
    const isLastSegment = index === contentSegments.length - 1;

    if (isDynamicSegment(segment) || isLastSegment) {
      currentPath += `/${segment}`;
      return;
    }

    currentPath += `/${segment}`;
    const label = navBySegment.get(segment) ?? segmentLabelMap[segment] ?? formatSegmentLabel(segment);

    if (label && label !== title) {
      crumbs.push({ label, to: currentPath });
    }
  });

  if (crumbs.length === 0 || crumbs[crumbs.length - 1]?.label !== title) {
    crumbs.push({ label: title });
  }

  return crumbs;
}

function isDynamicSegment(segment: string) {
  return segment.startsWith("OR-") || segment.startsWith("DO-");
}

function formatSegmentLabel(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
