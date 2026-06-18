import { RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ImportBatch } from "@/lib/importStore";
import { cn } from "@/lib/utils";
import { EmptyTableState, StateBlock } from "./shared";

interface ImportLogTabProps {
  batch: ImportBatch;
  summary: { totalRows: number; dispatchedRows: number };
  onDispatch: () => void;
}

export function ImportLogTab({ batch, summary, onDispatch }: ImportLogTabProps) {
  return (
    <>
      <div className="divide-y divide-slate-200/80">
        {batch.dispatchRuns.length > 0 || batch.importJob ? (
          <div className="bg-white px-5 py-5 sm:px-6">
            {batch.importJob ? (
              <div className="mb-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Import Job</p>
                    <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                      Status: <span className={cn(batch.importJob.status === "imported" ? "text-success" : batch.importJob.status === "failed" ? "text-destructive" : "text-warning")}>{batch.importJob.status}</span>
                    </p>
                  </div>
                  {batch.importJob.status === "failed" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onDispatch}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Retry failed
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <StateBlock label="Created ORs" value={String(batch.importJob.createdOrderIds.length)} />
                  <StateBlock label="Completed rows" value={String(batch.importJob.completedRowIds.length)} />
                  <StateBlock label="Failed rows" value={String(batch.importJob.failedRowIds.length)} />
                  <StateBlock label="Retries" value={String(batch.importJob.retryCount)} />
                </div>

                {batch.importJob.lastError ? (
                  <Alert className="rounded-xl border-destructive/20 bg-destructive/5 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Last error</AlertTitle>
                    <AlertDescription>{batch.importJob.lastError}</AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}

            {batch.dispatchRuns.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">
                  Dispatch Runs
                  <span className="ml-2 font-normal text-slate-400">— {batch.dispatchRuns.length} run{batch.dispatchRuns.length === 1 ? "" : "s"}</span>
                </p>
                {batch.dispatchRuns.map((run) => (
                  <div key={run.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Run {new Date(run.createdAt).toLocaleString()}</p>
                        <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">{run.createdOrderIds.length} OR(s) created</p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                        {run.completedGroupKeys.length} groups
                      </Badge>
                    </div>
                    {run.skippedExistingOrderIds.length > 0 ? (
                      <p className="mt-2 text-xs leading-5 text-warning">
                        {run.skippedExistingOrderIds.length} existing OR(s) skipped
                      </p>
                    ) : null}
                    {run.createdOrderIds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {run.createdOrderIds.map((id) => (
                          <Badge key={id} variant="outline" className="rounded-full border-success/20 bg-success/5 text-xs normal-case tracking-normal text-success">
                            {id}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {!batch.importJob && batch.dispatchRuns.length === 0 ? (
              <EmptyTableState
                title="No import activity yet"
                body="Run an import to see the log here."
              />
            ) : null}
          </div>
        ) : (
          <div className="px-6 py-16">
            <EmptyTableState
              title="No import activity yet"
              body="Run an import to see the log here."
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Import Log</CardDescription>
          <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Import activity summary</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Track the results of import runs and retry failed operations if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StateBlock label="Total ORs created" value={String(batch.dispatchRuns.reduce((s, r) => s + r.createdOrderIds.length, 0))} />
            <StateBlock label="Total runs" value={String(batch.dispatchRuns.length)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StateBlock label="Imported rows" value={String(summary.dispatchedRows)} />
            <StateBlock label="Skipped ORs" value={String(batch.dispatchRuns.reduce((s, r) => s + r.skippedExistingOrderIds.length, 0))} />
          </div>

          {batch.importJob?.status === "failed" ? (
            <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <p className="text-xs font-semibold normal-case tracking-normal text-destructive">Last import failed</p>
              <p className="text-xs leading-5 text-destructive">{batch.importJob.lastError || "Unknown error"}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDispatch}
                className="mt-2 h-8 rounded-full border-destructive/20 bg-white px-3 text-xs text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Retry failed import
              </Button>
            </div>
          ) : null}

          {summary.totalRows > 0 && summary.dispatchedRows === summary.totalRows ? (
            <div className="flex items-center gap-3 rounded-xl border-success/20 bg-success/5 p-3.5">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-xs font-semibold normal-case tracking-normal text-success">Batch fully imported</p>
                <p className="text-xs leading-5 text-success">All {summary.totalRows} rows have been processed.</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
