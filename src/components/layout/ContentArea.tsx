import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebarVisibility } from "@/components/layout/Sidebar";

interface ContentAreaProps {
  children: ReactNode;
  className?: string;
}

export function ContentArea({ children, className }: ContentAreaProps) {
  const { open: sidebarOpen } = useSidebarVisibility();

  return (
    <div className={cn("flex-1 min-w-0", sidebarOpen ? "lg:ml-60" : "lg:ml-0", className)}>
      {children}
    </div>
  );
}
