import { ArrowDown, ArrowUp, ChevronsRight, Plus, Trash2, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImportBatch, ImportBatchRow, ImportAssignmentRuleField } from "@/lib/importStore";
import type { AssignmentGroup, AssignmentDraftSummary, RuleConditionDraft } from "./types";
import { ruleFieldOptions } from "./types";
import { EmptyTableState, PreviewGroupList, StateBlock } from "./shared";

interface AssignmentGroupsTabProps {
  batch: ImportBatch;
  summary: { blockerRows: number; totalRows: number };
  assignmentGroups: AssignmentGroup[];
  suppliers: Array<{ id: string; name: string; status: string }>;
  ruleVendorId: string;
  setRuleVendorId: (id: string) => void;
  ruleConditions: RuleConditionDraft[];
  ruleValueOptions: Record<string, string[]>;
  ruleVendorName: string | null;
  selectedVendorId: string;
  setSelectedVendorId: (id: string) => void;
  selectedVendorName: string | null;
  selectedRowIds: string[];
  assignmentDraftSummary: AssignmentDraftSummary;
  assignmentPreviewEntries: Array<[string, number]>;
  onAssignGroup: (rows: ImportBatchRow[], vendorId: string) => void;
  onCreateRule: () => void;
  onPreviewAssignments: () => void;
  onApproveAssignmentDraft: () => void;
  onAssign: () => void;
  onUpdateRuleCondition: (index: number, next: Partial<RuleConditionDraft>) => void;
  onAddRuleCondition: () => void;
  onRemoveRuleCondition: (index: number) => void;
  onDeleteAssignmentRule: (ruleId: string) => void;
  onMoveAssignmentRule: (ruleId: string, direction: "up" | "down") => void;
  onClearAssignmentDraft: (batchId: string) => void;
}

function getRuleFieldLabel(field: ImportAssignmentRuleField) {
  return ruleFieldOptions.find((option) => option.value === field)?.label ?? field;
}

export function AssignmentGroupsTab({
  batch,
  summary,
  assignmentGroups,
  suppliers,
  ruleVendorId,
  setRuleVendorId,
  ruleConditions,
  ruleValueOptions,
  ruleVendorName,
  selectedVendorId,
  setSelectedVendorId,
  selectedVendorName,
  selectedRowIds,
  assignmentDraftSummary,
  assignmentPreviewEntries,
  onAssignGroup,
  onCreateRule,
  onPreviewAssignments,
  onApproveAssignmentDraft,
  onAssign,
  onUpdateRuleCondition,
  onAddRuleCondition,
  onRemoveRuleCondition,
  onDeleteAssignmentRule,
  onMoveAssignmentRule,
  onClearAssignmentDraft,
}: AssignmentGroupsTabProps) {
  const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE");

  return (
    <>
      <div className="divide-y divide-slate-200/80">
        {assignmentGroups.length > 0 ? (
          <div className="bg-white px-5 py-5 sm:px-6">
            <p className="mb-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
              Assignment Groups
              <span className="ml-2 font-normal text-slate-400">— {assignmentGroups.length} group{assignmentGroups.length === 1 ? "" : "s"} · {assignmentGroups.reduce((s, g) => s + g.rowCount, 0)} rows</span>
            </p>
            <Table className="min-w-full text-left mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Total Qty</TableHead>
                  <TableHead>Sales Points</TableHead>
                  <TableHead>Vendor Assignment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentGroups.map((group) => {
                  const recommendedVendor = activeSuppliers.find(
                    (s) => s.name.toLowerCase().includes(group.region.toLowerCase().slice(0, 4)),
                  );

                  return (
                    <TableRow key={group.key}>
                      <TableCell className="font-medium">{group.label}</TableCell>
                      <TableCell>{group.region}</TableCell>
                      <TableCell>{group.rowCount}</TableCell>
                      <TableCell>{group.totalQty}</TableCell>
                      <TableCell>{group.salesPointCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={(vendorId) => onAssignGroup(group.rows, vendorId)}>
                            <SelectTrigger className="w-[200px] h-8">
                              <SelectValue placeholder={recommendedVendor ? `Recommended: ${recommendedVendor.name}` : "Select vendor..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {activeSuppliers.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="px-6 py-16">
            <EmptyTableState
              title="No rows need assignment"
              body={summary.blockerRows > 0 ? "Resolve blockers first before assigning vendors." : "All rows have been assigned to vendors."}
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription className="text-xs normal-case tracking-normal text-slate-500">Vendor Assignment</CardDescription>
          <CardTitle className="text-base font-semibold tracking-[-0.04em] text-slate-950">Assign vendor to group</CardTitle>
          <CardDescription className="text-sm leading-6 text-slate-600">
            Build batch rules from row attributes, preview the coverage, then approve the draft assignment once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule builder</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                  Assign by region, brand, category, or sales point
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                {batch.assignmentRules.length} rule{batch.assignmentRules.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {ruleConditions.map((condition, index) => {
              const usedFields = ruleConditions.map((entry) => entry.field);
              const fieldOptions = ruleFieldOptions.filter(
                (option) => option.value === condition.field || !usedFields.includes(option.value),
              );

              return (
                <div key={`${condition.field}-${index}`} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)_auto]">
                    <Select value={condition.field} onValueChange={(value) => onUpdateRuleCondition(index, { field: value as ImportAssignmentRuleField })}>
                      <SelectTrigger aria-label={`Rule field ${index + 1}`} className="h-10 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="normal-case tracking-normal">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={condition.value} onValueChange={(value) => onUpdateRuleCondition(index, { value })}>
                      <SelectTrigger aria-label={`Rule value ${index + 1}`} className="h-10 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {(ruleValueOptions[condition.field] ?? []).map((option) => (
                          <SelectItem key={option} value={option} className="normal-case tracking-normal">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={ruleConditions.length === 1}
                      onClick={() => onRemoveRuleCondition(index)}
                      className="h-10 w-10 text-slate-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={onAddRuleCondition}
              disabled={ruleConditions.length >= ruleFieldOptions.length}
              className="h-10 border-dashed border-slate-300 bg-white"
            >
              <Plus className="h-4 w-4" />
              Add condition
            </Button>

            <label className="grid gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500">
              Assign to vendor
              <Select value={ruleVendorId} onValueChange={setRuleVendorId}>
                <SelectTrigger aria-label="Rule vendor" className="h-11 rounded-xl border-slate-200 bg-white normal-case tracking-normal">
                  <SelectValue placeholder="Select vendor..." className="normal-case tracking-normal" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="normal-case tracking-normal">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button
              type="button"
              onClick={onCreateRule}
              disabled={!ruleVendorId || ruleConditions.every((condition) => condition.value.trim().length === 0)}
              className="h-11 bg-slate-950 text-white hover:bg-slate-900"
            >
              Create assignment rule
              <Plus className="h-3.5 w-3.5" />
            </Button>

            {ruleVendorName ? (
              <p className="text-xs leading-5 text-slate-500">
                New rule will assign to <span className="font-semibold text-slate-700">{ruleVendorName}</span>.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule priority</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreviewAssignments}
                disabled={batch.assignmentRules.length === 0}
                className="h-8 px-3 text-xs"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Preview draft
              </Button>
            </div>
            {batch.assignmentRules.length === 0 ? (
              <p className="text-xs leading-5 text-slate-500">No rules yet. Add a rule to start drafting assignment coverage for this batch.</p>
            ) : (
              <div className="space-y-2">
                {batch.assignmentRules.map((rule, index) => (
                  <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Priority {index + 1}</p>
                        <p className="mt-1 truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">{rule.vendorName}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {rule.conditions.map((condition) => `${getRuleFieldLabel(condition.field)} = ${condition.value}`).join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => onMoveAssignmentRule(rule.id, "up")}
                          className="h-8 w-8 text-slate-500"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === batch.assignmentRules.length - 1}
                          onClick={() => onMoveAssignmentRule(rule.id, "down")}
                          className="h-8 w-8 text-slate-500"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteAssignmentRule(rule.id)}
                          className="h-8 w-8 text-slate-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Draft review</p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-950">
                  {assignmentDraftSummary.matchedCount} row(s) matched by rules
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                {batch.assignmentDraft ? "Preview ready" : "Not generated"}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StateBlock label="Matched" value={String(assignmentDraftSummary.matchedCount)} />
              <StateBlock label="Left open" value={String(assignmentDraftSummary.unmatchedCount)} />
              <StateBlock label="Blocked" value={String(assignmentDraftSummary.blockedCount)} />
            </div>

            {batch.assignmentDraft ? (
              <>
                <div className="space-y-2">
                  {assignmentDraftSummary.ruleCounts.map((entry, index) => (
                    <div key={entry.ruleId} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Rule {index + 1}</p>
                        <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">{entry.vendorName}</p>
                        <p className="text-xs leading-5 text-slate-500">{entry.summary}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-xs normal-case tracking-normal text-slate-600">
                        {entry.count} rows
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onClearAssignmentDraft(batch.id)}
                    className="h-11 border-slate-200 bg-white"
                  >
                    Clear draft
                  </Button>
                  <Button
                    type="button"
                    onClick={onApproveAssignmentDraft}
                    disabled={assignmentDraftSummary.matchedCount === 0}
                    className="h-11 bg-slate-950 text-white hover:bg-slate-900"
                  >
                    Approve draft assignments
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs leading-5 text-slate-500">
                Generate a preview to see how many unassigned rows each rule will capture before anything is committed.
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold normal-case tracking-normal text-slate-500">
              <span>Manual override</span>
              <span>{selectedRowIds.length} selected</span>
            </div>
            <p className="truncate text-sm font-semibold tracking-[-0.02em] text-slate-950">
              Vendor: {selectedVendorName ?? "Not selected"}
            </p>
            <p className="text-xs leading-5 text-slate-500">
              Use this only for exceptions after the rule draft has covered the bulk of the batch.
            </p>

            <label className="grid gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500">
              Assign vendor
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger aria-label="Manual vendor" className="h-11 rounded-xl border-slate-200 bg-slate-50 normal-case tracking-normal">
                  <SelectValue placeholder="Select vendor..." className="normal-case tracking-normal" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="normal-case tracking-normal">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button
              onClick={onAssign}
              disabled={!selectedVendorId || selectedRowIds.length === 0}
              className="h-11 w-full bg-slate-950 text-white hover:bg-slate-900"
            >
              Assign selected rows
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">Manual assignment preview</p>
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-xs normal-case tracking-normal text-slate-600">
                  {assignmentPreviewEntries.length} group{assignmentPreviewEntries.length === 1 ? "" : "s"}
                </Badge>
              </div>
              {assignmentPreviewEntries.length === 0 ? (
                <p className="text-xs leading-5 text-slate-500">Select assignable rows and a vendor to preview the OR groups that selection will feed.</p>
              ) : (
                <PreviewGroupList entries={assignmentPreviewEntries} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
