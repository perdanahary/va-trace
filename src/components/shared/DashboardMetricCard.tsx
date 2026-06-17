import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  index?: number;
  color?: string;
  icon?: LucideIcon;
  iconTone?: "default" | "warning" | "success" | "processing";
  onClick?: () => void;
}

const toneBgMap: Record<string, string> = {
  warning: "bg-warning/10",
  success: "bg-success/10",
  processing: "bg-processing/10",
};

const toneTextMap: Record<string, string> = {
  warning: "text-warning",
  success: "text-success",
  processing: "text-processing",
};

export function DashboardMetricCard({
  label,
  value,
  sublabel,
  index,
  color,
  icon: Icon,
  iconTone,
  onClick,
}: DashboardMetricCardProps) {
  return (
    <Card
      className={cn(
        "group border-border/70 shadow-sm transition-colors hover:border-primary/40",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className={cn("text-3xl", !!color && color)}>{value}</CardTitle>
        </div>
        {onClick && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        )}
        {Icon && (
          <div
            className={cn(
              "rounded-md p-2",
              iconTone ? toneBgMap[iconTone] ?? "bg-muted" : "bg-muted",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                iconTone ? toneTextMap[iconTone] ?? "text-muted-foreground" : "text-muted-foreground",
              )}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between pt-0">
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        {index != null && (
          <Badge variant="outline" className={cn("rounded-full text-[10px] uppercase tracking-[0.24em]", !sublabel && "ml-auto")}>
            #{String(index + 1).padStart(2, "0")}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
