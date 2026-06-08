import { User, LogOut, Settings, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/components/layout/Sidebar";

const accountByRole: Record<
  UserRole,
  {
    name: string;
    title: string;
    initials: string;
    status: "Active" | "Inactive";
  }
> = {
  admin: {
    name: "Admin User",
    title: "Procurement Manager",
    initials: "AU",
    status: "Active",
  },
  operator: {
    name: "Admin User",
    title: "Procurement Manager",
    initials: "AU",
    status: "Active",
  },
  analyst: {
    name: "Admin User",
    title: "Procurement Manager",
    initials: "AU",
    status: "Active",
  },
  customer: {
    name: "Admin User",
    title: "Procurement Manager",
    initials: "AU",
    status: "Active",
  },
  vendor: {
    name: "Admin User",
    title: "Procurement Manager",
    initials: "AU",
    status: "Active",
  },
};

interface UserAccountMenuProps {
  role: UserRole;
  compact?: boolean;
}

export function UserAccountMenu({ role, compact = false }: UserAccountMenuProps) {
  const account = accountByRole[role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={compact ? "h-10 px-2" : "h-11 gap-2 px-2.5"}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 text-left md:block">
            <div className="flex items-center gap-2">
              <p className="truncate text-xs font-medium leading-none">{account.name}</p>
              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] uppercase tracking-[0.2em]">
                {account.status}
              </Badge>
            </div>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">{account.title}</p>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">{account.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium leading-none">{account.name}</p>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] uppercase tracking-[0.2em]">
                  {account.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{account.title}</p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span>Current role</span>
            <span>{role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
