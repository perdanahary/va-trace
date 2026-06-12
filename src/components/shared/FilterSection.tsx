import * as React from "react";

import { cn } from "@/lib/utils";

export function FilterSection({
  children,
  actions,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border/70 bg-card shadow-sm", className)}>
      <div className={cn("grid gap-4 p-6 md:grid-cols-3 xl:grid-cols-[repeat(2,minmax(0,1fr))_auto]", contentClassName)}>
        {children}
        {actions ? <div className="flex items-end justify-between gap-3 md:col-span-full xl:col-span-1 xl:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
