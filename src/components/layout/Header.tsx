import { Bell, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { unreadInboxCount } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getNavItemsForRole, type UserRole } from "@/components/layout/Sidebar";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";

interface HeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const location = useLocation();
  const currentRole = (location.pathname.split("/")[1] || "admin") as UserRole;
  const inboxPath = `/${currentRole}/inbox`;
  const navItems = getNavItemsForRole(currentRole);

  return (
    <header className={cn("sticky top-0 z-20 border-b bg-background/90 backdrop-blur", className)}>
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader className="text-left">
                <SheetTitle>VA Trace</SheetTitle>
              </SheetHeader>
              <Separator className="my-4" />
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      asChild
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn("h-11 w-full justify-start gap-3 px-3", isActive && "bg-primary text-primary-foreground hover:bg-primary/90")}
                    >
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative" aria-label="Open inbox">
            <Link to={inboxPath}>
              <Bell className="h-4 w-4" />
              {unreadInboxCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {unreadInboxCount}
                </span>
              ) : null}
            </Link>
          </Button>

          <Separator orientation="vertical" className="hidden h-6 md:block" />

          <UserAccountMenu role={currentRole} />
        </div>
      </div>
    </header>
  );
}
