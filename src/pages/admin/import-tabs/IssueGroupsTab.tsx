import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportBatch, ImportBatchRow, DuplicateDecision } from "@/lib/importStore";
import type { IssueSummary } from "./types";
import { EmptyTableState, FlowProgressRow, toIssueLabel } from "./shared";

interface IssueGroupsTabProps {
  batch: ImportBatch;
  summary: {
    totalRows: number;
    blockerRows: number;
    unassignedRows: number;
    dispatchedRows: number;
    excludedRows: number;
  };
  issueSummaries: IssueSummary[];
  duplicateSummary: IssueSummary | null;
  dispatchReadiness: {
    dispatchableRows: ImportBatchRow[];
  } | null;
  onBulkDuplicateDecision: (label: string, rowIds: string[], decision: DuplicateDecision) => void;
  onBulkMapToProduct: (issueLabel: string) => void;
  onBulkCreateProduct: (issueLabel: string) => void;
  onBulkExclude: (label: string, rowIds: string[]) => void;
  onExportIssueList: (label: string, rows: ImportBatchRow[]) => void;
}

export function IssueGroupsTab({
  batch,
  summary,
  issueSummaries,
  duplicateSummary,
  dispatchReadiness,
  onBulkDuplicateDecision,
  onBulkMapToProduct,
  onBulkCreateProduct,
  onBulkExclude,
  onExportIssueList,
}: IssueGroupsTabProps) {
  return (
    <>
      <div className="divide-y divide-slate-200/80">
        {duplicateSummary && duplicateSummary.rowIds.length > 0 ? (
          <div className="bg-white px-5 py-5 sm:px-6">
            <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">Unresolved Issues</p>
            <Table className="min-w-full text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Issue type</TableHead>
                  <TableHead>Affected rows</TableHead>
                  <TableHead>Detected value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">{duplicateSummary.label}</TableCell>
                  <TableCell>{duplicateSummary.rowIds.length}</TableCell>
                  <TableCell>Rows with matching PO, sales point, item, and quantity</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={() => onBulkDuplicateDecision(duplicateSummary.label, duplicateSummary.rowIds, "include")}>Import anyway</Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10" onClick={() => onBulkDuplicateDecision(duplicateSummary.label, duplicateSummary.rowIds, "exclude")}>Exclude all matching</Button>
                      <Button size="sm" variant="outline" onClick={() => onExportIssueList(duplicateSummary.label, duplicateSummary.rows)}>Export issue list</Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : null}

        {issueSummaries.length > 0 ? (
          <div className="bg-white px-5 py-5 sm:px-6">
            {!duplicateSummary || duplicateSummary.rowIds.length === 0 ? (
              <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">Unresolved Issues</p>
            ) : null}
            <Table className="min-w-full text-left mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Issue type</TableHead>
                  <TableHead>Affected rows</TableHead>
                  <TableHead>Detected value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issueSummaries.map((issue) => (
                  <TableRow key={issue.key}>
                    <TableCell className="font-medium">{issue.label}</TableCell>
                    <TableCell>{issue.rowIds.length}</TableCell>
                    <TableCell>{issue.rows[0]?.raw.itemCode || issue.rows[0]?.raw.itemName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10" onClick={() => onBulkMapToProduct(issue.label)}>Map to product</Button>
                        <Button size="sm" variant="outline" onClick={() => onBulkCreateProduct(issue.label)}>Create product</Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10" onClick={() => onBulkExclude(issue.label, issue.rowIds)}>Exclude all matching</Button>
                        <Button size="sm" variant="outline" onClick={() => onExportIssueList(issue.label, issue.rows)}>Export issue list</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {issueSummaries.length === 0 && (!duplicateSummary || duplicateSummary.rowIds.length === 0) ? (
          <div className="px-6 py-16">
            <EmptyTableState
              title="No blockers found"
              body="All rows passed validation. Proceed to vendor assignment."
            />
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Flow progress</p>
            <div className="space-y-1.5">
              <FlowProgressRow label="Imported" value={summary.totalRows} active={false} complete={false} />
              <FlowProgressRow label="Blocked" value={summary.blockerRows} active={summary.blockerRows > 0} complete={summary.blockerRows === 0} />
              <FlowProgressRow label="Assignable" value={summary.totalRows - summary.blockerRows - summary.dispatchedRows - summary.excludedRows} active={summary.blockerRows === 0 && summary.unassignedRows > 0} complete={summary.unassignedRows === 0} />
              <FlowProgressRow label="Ready" value={dispatchReadiness?.dispatchableRows.length ?? 0} active={(dispatchReadiness?.dispatchableRows.length ?? 0) > 0} complete={(dispatchReadiness?.dispatchableRows.length ?? 0) === 0 && summary.dispatchedRows > 0} />
              <FlowProgressRow label="Imported ✓" value={summary.dispatchedRows} active={false} complete={summary.dispatchedRows > 0} />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
