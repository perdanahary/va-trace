import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import type { UserRole } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  operator: "Operator",
  analyst: "Analyst",
  customer: "Customer",
  vendor: "Vendor",
};

const rolePaths: Record<UserRole, string> = {
  admin: "/admin",
  operator: "/operator",
  analyst: "/analyst",
  customer: "/customer",
  vendor: "/vendor",
};

export function RoleSwitcherFloatingButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const currentRole = getCurrentRole(location.pathname);
  const shouldHide = location.pathname.includes("/delivery-note") || location.pathname.includes("/packaging-labels");

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (shouldHide) {
    return null;
  }

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-30 print:hidden sm:bottom-6 sm:right-6">
      {open ? (
        <div className="absolute bottom-14 right-0 w-56 rounded-2xl border border-border/70 bg-popover/95 p-2 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Role switcher</div>
            <div className="mt-1 text-sm font-medium text-foreground">Current: {roleLabels[currentRole]}</div>
          </div>
          <div className="my-1 h-px bg-border" />

          <div className="space-y-1">
            {(Object.keys(roleLabels) as UserRole[]).map((role) => {
              const isActive = currentRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(rolePaths[role], { replace: true });
                  }}
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-colors",
                    isActive ? "bg-primary/10 text-foreground" : "hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="font-medium">{roleLabels[role]}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{role.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <Button
        variant="outline"
        size="icon"
        className={cn(
          "h-12 w-12 rounded-full border-border/80 bg-background/90 text-foreground shadow-[0_16px_36px_-20px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 hover:bg-background active:translate-y-0 active:scale-[0.97]",
          open && "border-primary/30 bg-primary text-primary-foreground",
        )}
        aria-label="Switch role"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        title={`Switch role from ${roleLabels[currentRole]}`}
      >
        <ShieldCheck className="h-5 w-5" />
      </Button>
    </div>
  );
}

function getCurrentRole(pathname: string): UserRole {
  const role = pathname.split("/")[1] as UserRole | undefined;
  if (role && role in roleLabels) {
    return role;
  }
  return "admin";
}
