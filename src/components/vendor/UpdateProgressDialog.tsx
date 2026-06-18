import { useCallback, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionStatusBadge } from "@/components/domain/badges/badges";
import type { ProductionJob } from "@/lib/types/v2/production";

interface JobDraft {
  producedQuantity: number;
  completedQuantity: number;
}

interface UpdateProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJobs: ProductionJob[];
  onConfirm: (updates: Record<string, JobDraft>) => void;
}

function initDraft(job: ProductionJob): JobDraft {
  return {
    producedQuantity: job.producedQuantity,
    completedQuantity: job.completedQuantity,
  };
}

const FIELDS_BY_STATUS: Record<string, { key: keyof JobDraft; label: string }[]> = {
  ACCEPTED: [{ key: "producedQuantity", label: "Produced" }],
  IN_PROGRESS: [
    { key: "producedQuantity", label: "Produced" },
    { key: "completedQuantity", label: "Finish" },
  ],
};

export function UpdateProgressDialog({
  open,
  onOpenChange,
  selectedJobs,
  onConfirm,
}: UpdateProgressDialogProps) {
  const [unify, setUnify] = useState(true);
  const [unified, setUnified] = useState<JobDraft>(() =>
    selectedJobs.length > 0 ? initDraft(selectedJobs[0]) : { producedQuantity: 0, completedQuantity: 0 },
  );
  const [individual, setIndividual] = useState<Record<string, JobDraft>>(() => {
    const map: Record<string, JobDraft> = {};
    for (const j of selectedJobs) map[j.id] = initDraft(j);
    return map;
  });

  const handleUnifiedChange = useCallback((field: keyof JobDraft, value: number) => {
    setUnified((prev) => ({ ...prev, [field]: Math.max(0, value) }));
  }, []);

  const handleIndividualChange = useCallback(
    (jobId: string, field: keyof JobDraft, value: number) => {
      setIndividual((prev) => ({
        ...prev,
        [jobId]: { ...(prev[jobId] ?? initDraft(selectedJobs.find((j) => j.id === jobId)!)), [field]: Math.max(0, value) },
      }));
    },
    [selectedJobs],
  );

  const handleConfirm = useCallback(() => {
    if (unify) {
      const updates: Record<string, JobDraft> = {};
      for (const j of selectedJobs) updates[j.id] = unified;
      onConfirm(updates);
    } else {
      onConfirm(individual);
    }
    onOpenChange(false);
  }, [unify, unified, individual, selectedJobs, onConfirm, onOpenChange]);

  const statusGroups = useMemo(() => {
    const groups: Record<string, ProductionJob[]> = {};
    for (const j of selectedJobs) {
      const key = j.status === "ACCEPTED" || j.status === "IN_PROGRESS" ? j.status : "IN_PROGRESS";
      (groups[key] ??= []).push(j);
    }
    return groups;
  }, [selectedJobs]);

  if (selectedJobs.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Update Production Progress</DialogTitle>
          <DialogDescription>
            {selectedJobs.length} job{selectedJobs.length !== 1 && "s"} selected
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unify}
              onChange={(e) => setUnify(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Apply same quantities to all selected jobs
          </label>

          {unify ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Produced</Label>
                <Input
                  type="number"
                  min={0}
                  value={unified.producedQuantity}
                  onChange={(e) => handleUnifiedChange("producedQuantity", Number(e.target.value) || 0)}
                  className="h-8 text-right"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Finish</Label>
                <Input
                  type="number"
                  min={0}
                  value={unified.completedQuantity}
                  onChange={(e) => handleUnifiedChange("completedQuantity", Number(e.target.value) || 0)}
                  className="h-8 text-right"
                />
              </div>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {Object.entries(statusGroups).map(([status, jobs]) => {
                const fields = FIELDS_BY_STATUS[status] ?? FIELDS_BY_STATUS.IN_PROGRESS;
                return (
                  <div key={status}>
                    {jobs.map((job) => {
                      const draft = individual[job.id] ?? initDraft(job);
                      return (
                        <div key={job.id} className="mb-2 rounded-md border border-border/60 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold">{job.jobNumber}</span>
                            <ProductionStatusBadge status={job.status} />
                          </div>
                          <div className={`grid grid-cols-${fields.length} gap-3`}>
                            {fields.map((f) => (
                              <div key={f.key} className="space-y-0.5">
                                <Label className="text-[10px]">{f.label}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={draft[f.key]}
                                  onChange={(e) =>
                                    handleIndividualChange(job.id, f.key, Number(e.target.value) || 0)
                                  }
                                  className="h-7 text-right text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm}>
            <Save className="mr-2 h-4 w-4" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
