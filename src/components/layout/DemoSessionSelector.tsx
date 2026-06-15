import { useState } from "react";
import { Check, Database, RotateCcw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { applyDemoSessionMode, useDemoSessionMode, type DemoSessionMode } from "@/lib/demoSession";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const labels: Record<DemoSessionMode, string> = {
  snapshot: "Snapshot Data",
  fresh: "Fresh Demo Run",
};

export function DemoSessionSelector() {
  const mode = useDemoSessionMode();
  const [isApplying, setIsApplying] = useState(false);

  const handleModeChange = async (nextMode: DemoSessionMode) => {
    if (nextMode === mode || isApplying) {
      return;
    }

    const confirmed = window.confirm(
      nextMode === "fresh"
        ? "Start a fresh demo run? This clears orders, imports, shipments, labels, Proofs of Delivery (PODs), and exceptions while keeping demo master data."
        : "Restore the snapshot demo data? This replaces the current browser session with the seeded mock/demo state.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsApplying(true);
      await applyDemoSessionMode(nextMode);
      toast.success(nextMode === "fresh" ? "Fresh demo run prepared." : "Snapshot demo data restored.");
      window.location.assign(nextMode === "fresh" ? "/admin/imports" : "/admin");
    } catch (error) {
      setIsApplying(false);
      toast.error(error instanceof Error ? error.message : "Failed to switch demo session.");
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-30 hidden md:block sm:bottom-24 sm:right-6 print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full border-border/80 bg-background/90 text-foreground shadow-[0_16px_36px_-20px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 hover:bg-background active:translate-y-0 active:scale-[0.97]"
            aria-label="Choose demo session"
            disabled={isApplying}
            title={`Demo session: ${labels[mode]}`}
          >
            {mode === "fresh" ? <RotateCcw className="h-5 w-5" /> : <Database className="h-5 w-5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={12} className="w-64 rounded-2xl border-border/70 p-2 shadow-[0_20px_45px_-20px_rgba(15,23,42,0.35)]">
          <DropdownMenuLabel className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Demo session
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void handleModeChange("snapshot")}
            disabled={isApplying}
            className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5", mode === "snapshot" && "bg-primary/10 text-foreground")}
          >
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{labels.snapshot}</span>
            {mode === "snapshot" ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleModeChange("fresh")}
            disabled={isApplying}
            className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5", mode === "fresh" && "bg-primary/10 text-foreground")}
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{labels.fresh}</span>
            {mode === "fresh" ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
