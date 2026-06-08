import { Bell, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { unreadInboxCount } from "@/lib/messages";

interface HeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const location = useLocation();
  const currentRole = location.pathname.split("/")[1] || "admin";
  const inboxPath = `/${currentRole}/inbox`;

  return (
    <header className={cn("h-16 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10", className)}>
      <h1 className="text-lg font-semibold tracking-tight animate-in-smart">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative group animate-in-smart" style={{ animationDelay: '100ms' }}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="pl-9 pr-4 py-1.5 bg-accent/50 border-none rounded-md text-sm w-64 focus:ring-1 focus:ring-primary transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={inboxPath}
            className="p-2 hover:bg-accent rounded-full transition-colors relative btn-press animate-in-smart"
            style={{ animationDelay: '200ms' }}
            aria-label="Open inbox"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            {unreadInboxCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadInboxCount}
              </span>
            ) : null}
          </Link>
          
          <div className="w-px h-6 bg-border mx-2"></div>

          <button className="flex items-center gap-2 p-1 hover:bg-accent rounded-md transition-colors btn-press animate-in-smart" style={{ animationDelay: '300ms' }}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold leading-none">Admin User</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-1">Procurement Manager</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
