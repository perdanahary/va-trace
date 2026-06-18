import { AlertCircle, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ImportBatch } from "@/lib/importStore";
import type { OrPreviewVendor } from "./types";
import { EmptyTableState, QueueStat, StateBlock } from "./shared";

interface ORPreviewTabProps {
  batch: ImportBatch;
  summary: { unassignedRows: number; blockerRows: number };
  orPreviewData: OrPreviewVendor[];
  dispatchReadiness: { dispatchableRows: unknown[] } | null;
  canImport: boolean;
  dispatchResultMessage: string | null;
  expandedOrVendor: string | null;
  onSetExpandedOrVendor: (name: string | null) => void;
  onDispatch: () => void;
}

export function ORPreviewTab({
  batch,
  summary,
  orPreviewData,
  dispatchReadiness,
  canImport,
  dispatchResultMessage,
  expandedOrVendor,
  onSetExpandedOrVendor,
  onDispatch,
}: ORPreviewTabProps) {
  return (
    <>
      <div className="divide-y divide-slate-200/80">
        {orPreviewData.length > 0 ? (
          <div className="bg-white px-5 py-5 sm:px-6">
            <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
              OR Preview
              <span className="ml-2 font-normal text-slate-400">— {orPreviewData.reduce((s, v) => s + v.orGroupCount, 0)} OR groups across {orPreviewData.length} vendor{orPreviewData.length === 1 ? "" : "s"}</span>
            </p>
            <div className="grid gap-4">
              {orPreviewData.map((vendor) => (
                <div key={vendor.vendorName} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">Vendor</p>
                      <p className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">{vendor.vendorName}</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <QueueStat label="OR groups" value={vendor.orGroupCount} />
                        <QueueStat label="Rows" value={vendor.rows.length} />
                        <QueueStat label="Total qty" value={vendor.totalQty} />
                        <QueueStat label="Sales points" value={vendor.salesPointCount} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <p className="text-xs leading-5 text-slate-500">PO: {vendor.sourcePOsList.join(", ")}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <p className="text-xs leading-5 text-slate-500">Region: {vendor.regionsList.join(", ")}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onSetExpandedOrVendor(expandedOrVendor === vendor.vendorName ? null : vendor.vendorName)}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      {expandedOrVendor === vendor.vendorName ? "Hide details" : `${vendor.orGroupCount} OR groups`}
                    </Button>
                  </div>

                  {expandedOrVendor === vendor.vendorName ? (
                    <div className="mt-4 space-y-2">
                      <Separator className="bg-slate-200" />
                      <p className="mt-2 text-xs font-semibold normal-case tracking-normal text-slate-500">OR Group Detail</p>
                      {vendor.orGroupEntries.map((orGroup) => (
                        <div key={orGroup.key} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold tracking-[-0.02em] text-slate-950">{orGroup.key}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {orGroup.count} rows · {orGroup.totalQty} qty
                              </p>
                            </div>
                            <Badge variant="outline" className="rounded-full border-success/20 bg-success/5 text-xs normal-case tracking-normal text-success">
                              Ready
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-16">
            <EmptyTableState
              title="No ORs to preview"
              body={summary.unassignedRows > 0 ? "Assign vendors first to generate OR preview." : "All rows have already been imported."}
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Import Summary</CardDescription>
          <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Ready to create ORs</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            {orPreviewData.reduce((s, v) => s + v.orGroupCount, 0)} ORs will be created · {dispatchReadiness?.dispatchableRows.length ?? 0} rows included
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StateBlock label="ORs to create" value={String(orPreviewData.reduce((s, v) => s + v.orGroupCount, 0))} />
            <StateBlock label="Vendors" value={String(orPreviewData.length)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StateBlock label="Total rows" value={String(dispatchReadiness?.dispatchableRows.length ?? 0)} />
            <StateBlock label="Total qty" value={String(orPreviewData.reduce((s, v) => s + v.totalQty, 0))} />
          </div>

          {orPreviewData.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              {orPreviewData.map((v) => (
                <div key={v.vendorName} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-[-0.02em] text-slate-950">{v.vendorName}</p>
                    <p className="text-xs leading-5 text-slate-500">{v.rows.length} rows · {v.totalQty} qty</p>
                  </div>
                  <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs normal-case tracking-normal text-slate-600">
                    {v.orGroupCount} ORs
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2 text-xs leading-5 text-slate-600">
            {summary.blockerRows > 0 ? (
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning" />
                {summary.blockerRows} blocker(s) must be resolved before import.
              </p>
            ) : null}
            {summary.unassignedRows > 0 ? (
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-primary" />
                {summary.unassignedRows} row(s) are unassigned and will remain in the queue for later.
              </p>
            ) : null}
            {(dispatchReadiness?.dispatchableRows.length ?? 0) > 0 && summary.blockerRows === 0 ? (
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-success" />
                Ready to create ORs for assigned rows.
              </p>
            ) : null}
          </div>

          <Button
            onClick={onDispatch}
            disabled={!canImport}
            className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-900"
          >
            {batch.importJob?.status === "failed" ? "Retry import ORs" : "Create Order Requests"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>

          {dispatchResultMessage ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
              {dispatchResultMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
