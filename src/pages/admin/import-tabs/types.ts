import type { UserRole } from "@/components/layout/Sidebar";
import type { ImportAssignmentRuleField, ImportBatch, ImportBatchRow, DuplicateDecision } from "@/lib/importStore";

export type WorkspaceTab = "issue-groups" | "assignment-groups" | "raw-rows" | "or-preview" | "import-log";

export type RuleConditionDraft = { field: ImportAssignmentRuleField; value: string };

export interface IssueSummary {
  key: string;
  label: string;
  rowIds: string[];
  rows: ImportBatchRow[];
}

export interface AssignmentGroup {
  key: string;
  label: string;
  rows: ImportBatchRow[];
  totalQty: number;
  salesPoints: Set<string>;
  region: string;
  itemCode: string;
  brand: string;
  category: string;
  rowCount: number;
  salesPointCount: number;
  salesPointsList: string[];
}

export interface OrPreviewVendor {
  vendorName: string;
  rows: ImportBatchRow[];
  totalQty: number;
  sourcePOsList: string[];
  regionsList: string[];
  salesPointCount: number;
  orGroupCount: number;
  orGroupEntries: Array<{
    key: string;
    rows: ImportBatchRow[];
    count: number;
    totalQty: number;
  }>;
}

export interface AssignmentDraftSummary {
  matchedCount: number;
  unmatchedCount: number;
  blockedCount: number;
  ruleCounts: Array<{
    ruleId: string;
    vendorName: string;
    count: number;
    summary: string;
  }>;
}

export const ruleFieldOptions: Array<{ value: ImportAssignmentRuleField; label: string }> = [
  { value: "region", label: "Region" },
  { value: "brand", label: "Brand" },
  { value: "category", label: "Category" },
  { value: "salesPoint", label: "Sales Point" },
];
