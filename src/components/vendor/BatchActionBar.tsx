import { useState } from "react";
import { Check, Play, RotateCcw, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductionJob } from "@/lib/types/v2/production";
import type { ProductionStatus } from "@/lib/types/v2/status";

export type BatchAction = "accept" | "update_progress" | "complete";

interface BatchActionBarProps {
  selectedCount: number;
  selectedJobs: ProductionJob[];
  onAction: (action: BatchAction) => void;
}

const ACTIONS: { value: BatchAction; label: string; icon: React.ReactNode; statusRequired: ProductionStatus[] }[] = [
  { value: "accept", label: "Accept Selected", icon: <Play className="h-4 w-4" />, statusRequired: ["SUBMITTED", "NEW"] },
  { value: "update_progress", label: "Update Progress", icon: <RotateCcw className="h-4 w-4" />, statusRequired: ["ACCEPTED", "IN_PROGRESS"] },
  { value: "complete", label: "Complete Selected", icon: <Target className="h-4 w-4" />, statusRequired: ["IN_PROGRESS"] },
];

export function BatchActionBar({ selectedCount, selectedJobs, onAction }: BatchActionBarProps) {
  const [selectedAction, setSelectedAction] = useState<BatchAction | null>(null);

  const actionMeta = ACTIONS.find((a) => a.value === selectedAction);
  const eligible = selectedAction
    ? ACTIONS.find((a) => a.value === selectedAction)?.statusRequired.some((s) =>
        selectedJobs.some((j) => j.status === s),
      ) ?? false
    : false;

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-2.5">
      <span className="text-sm font-medium">{selectedCount} selected</span>

      <Select
        value={selectedAction ?? ""}
        onValueChange={(value) => setSelectedAction(value as BatchAction)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Choose action..." />
        </SelectTrigger>
        <SelectContent>
          {ACTIONS.map((a) => (
            <SelectItem key={a.value} value={a.value} className="gap-2">
              <span className="flex items-center gap-2">
                {a.icon}
                {a.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        size="sm"
        disabled={!selectedAction || !eligible}
        onClick={() => {
          if (selectedAction) onAction(selectedAction);
          setSelectedAction(null);
        }}
      >
        <Check className="mr-1 h-3.5 w-3.5" />
        Apply
      </Button>
    </div>
  );
}
