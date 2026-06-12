import { useMemo, useState, type ReactNode } from "react";
import { Check, Filter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOptionNode {
  label: string;
  value: string;
  description?: string;
  keywords?: string[];
  children?: FilterOptionNode[];
}

export interface FilterGroup {
  id: string;
  label: string;
  operator?: "is" | "is not";
  value: string | null;
  onValueChange: (value: string | null) => void;
  onOperatorChange?: (value: "is" | "is not") => void;
  options: FilterOptionNode[];
  allLabel?: string;
  keywords?: string[];
}

type FilterTree = FilterOptionNode & { children?: FilterTree[] };

type AppliedFilterItem = {
  id: string;
  label: string;
  operator: "is" | "is not";
  valueLabel: string;
  onClear: () => void;
  onToggleOperator?: (value: "is" | "is not") => void;
};

export function matchesFilterValue(operator: "is" | "is not", actual: string, expected: string) {
  return operator === "is" ? actual === expected : actual !== expected;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function optionMatchesQuery(option: FilterOptionNode, query: string): boolean {
  if (!query) return true;

  const haystack = [option.label, option.description, ...(option.keywords ?? [])].filter(Boolean).join(" ").toLowerCase();
  if (haystack.includes(query)) return true;

  return Boolean(option.children?.some((child) => optionMatchesQuery(child, query)));
}

function filterOptions(options: FilterOptionNode[], query: string): FilterTree[] {
  if (!query) return options;

  return options
    .map((option) => {
      if (!optionMatchesQuery(option, query)) {
        return null;
      }

      if (!option.children?.length) {
        return option;
      }

      return {
        ...option,
        children: filterOptions(option.children, query),
      };
    })
    .filter((option): option is FilterTree => Boolean(option));
}

function findSelectedLabel(options: FilterOptionNode[], value: string | null): string | null {
  if (!value) return null;

  for (const option of options) {
    if (option.value === value) {
      return option.label;
    }

    const nested = option.children ? findSelectedLabel(option.children, value) : null;
    if (nested) {
      return nested;
    }
  }

  return null;
}

function renderOption(option: FilterTree, group: FilterGroup, currentValue: string | null, depth = 0): ReactNode {
  const selected = option.value === currentValue;
  const indent = depth > 0 ? "pl-8" : "";

  if (option.children?.length) {
    return (
      <DropdownMenuSub key={option.value}>
        <DropdownMenuSubTrigger className={cn("rounded-md", indent)}>
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          {selected ? <Check className="ml-2 h-4 w-4" /> : null}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-72 p-1">
          {group.allLabel ? (
            <>
              <DropdownMenuItem
                onClick={() => group.onValueChange(null)}
                className={cn("rounded-md", currentValue === null && "bg-accent text-accent-foreground")}
              >
                <span className="min-w-0 flex-1 truncate">{group.allLabel}</span>
                {currentValue === null ? <Check className="ml-2 h-4 w-4" /> : null}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {option.children.map((child) => renderOption(child, group, currentValue, depth + 1))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuItem
      key={option.value}
      onClick={() => group.onValueChange(option.value)}
      className={cn("rounded-md", indent, selected && "bg-accent text-accent-foreground")}
    >
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {selected ? <Check className="ml-2 h-4 w-4" /> : null}
    </DropdownMenuItem>
  );
}

function useFilterState(groups: FilterGroup[]) {
  const appliedFilters = useMemo(() => {
    return groups
      .map((group): AppliedFilterItem | null => {
        if (!group.value) return null;

        const label = findSelectedLabel(group.options, group.value) ?? group.value;
        return {
          id: group.id,
          label: group.label,
          operator: group.operator ?? "is",
          valueLabel: label,
          onClear: () => group.onValueChange(null),
          onToggleOperator: group.onOperatorChange,
        };
      })
      .filter(Boolean) as AppliedFilterItem[];
  }, [groups]);

  return { appliedFilters, activeCount: appliedFilters.length };
}

export function FilterMenu({ groups }: { groups: FilterGroup[] }) {
  const { appliedFilters, activeCount } = useFilterState(groups);
  const [groupSearchQueries, setGroupSearchQueries] = useState<Record<string, string>>({});

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={activeCount > 0 ? "secondary" : "outline"} className="h-9">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <Badge variant="secondary" className="ml-1 rounded-full px-2 py-0.5 text-[10px]">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit min-w-0 p-2">
        <div className="max-h-80 overflow-auto py-1">
          {groups.length > 0 ? (
            groups.map((group) => {
              const selectedLabel = findSelectedLabel(group.options, group.value);
              const query = normalize(groupSearchQueries[group.id] ?? "");
              const visibleOptions = filterOptions(group.options, query);

              return (
                <DropdownMenuSub key={group.id}>
                  <DropdownMenuSubTrigger className="rounded-md">
                    <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    {selectedLabel ? (
                      <span className="ml-2 max-w-[8rem] truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {selectedLabel}
                      </span>
                    ) : null}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-fit min-w-0 p-1">
                    <div className="flex items-center gap-2 border-b px-2 pb-2 pt-1">
                      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={groupSearchQueries[group.id] ?? ""}
                        onChange={(event) =>
                          setGroupSearchQueries((current) => ({
                            ...current,
                            [group.id]: event.target.value,
                          }))
                        }
                        placeholder={`Search ${group.label.toLowerCase()}...`}
                        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    {group.allLabel ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => group.onValueChange(null)}
                          className={cn("rounded-md", group.value === null && "bg-accent text-accent-foreground")}
                        >
                          <span className="min-w-0 flex-1 truncate">{group.allLabel}</span>
                          {group.value === null ? <Check className="ml-2 h-4 w-4" /> : null}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    ) : null}
                    {visibleOptions.map((option) => renderOption(option, group, group.value))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">No matching filters.</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppliedFilterRow({ groups, onClearAll, className }: { groups: FilterGroup[]; onClearAll: () => void; className?: string }) {
  const { appliedFilters, activeCount } = useFilterState(groups);

  if (activeCount === 0) {
    return null;
  }

  return (
    <section className={cn("rounded-xl border border-border/70 bg-card shadow-sm", className)}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {appliedFilters.map((filter) => (
              <div
                key={filter.id}
                role={filter.onToggleOperator ? "button" : undefined}
                tabIndex={filter.onToggleOperator ? 0 : undefined}
                aria-label={filter.onToggleOperator ? `Toggle ${filter.label} operator` : undefined}
                title={filter.onToggleOperator ? "Click to toggle operator" : undefined}
                onClick={() => {
                  if (!filter.onToggleOperator) return;
                  filter.onToggleOperator(filter.operator === "is" ? "is not" : "is");
                }}
                onKeyDown={(event) => {
                  if (!filter.onToggleOperator) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    filter.onToggleOperator(filter.operator === "is" ? "is not" : "is");
                  }
                }}
                className="inline-flex min-h-9 cursor-pointer items-stretch overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm transition-colors hover:border-border"
              >
                <span className="flex items-center border-r border-border/70 px-3 text-xs font-medium text-muted-foreground">
                  {filter.label}
                </span>
                <span
                  className={cn(
                    "flex items-center border-r border-border/70 px-3 text-sm font-medium",
                    filter.operator === "is not" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {filter.operator}
                </span>
                <span className="flex items-center px-3 text-sm font-medium text-foreground">{filter.valueLabel}</span>
                <button
                  type="button"
                  onClick={filter.onClear}
                  className="flex w-9 items-center justify-center border-l border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Clear ${filter.label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <Button
            variant="ghost"
            onClick={onClearAll}
            className="h-9 px-3 font-normal text-muted-foreground hover:bg-transparent hover:text-primary"
          >
            Clear
          </Button>
        </div>
      </div>
    </section>
  );
}
