import { useMemo } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { cn } from "@/lib/utils";

export function toIssueLabel(issue: string) {
  if (issue.toLowerCase() === "item code not found in product master") {
    return "Item code not found";
  }

  return issue;
}

export function FlowProgressRow({ label, value, active, complete }: { label: string; value: number; active: boolean; complete: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-xs",
      active ? "bg-primary/5 text-primary" : complete ? "bg-success/5 text-success" : "bg-slate-50 text-slate-500",
    )}>
      <div className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        active ? "bg-primary/20" : complete ? "bg-success/20" : "bg-slate-200",
      )}>
        {complete ? <CheckCircle2 className="h-3 w-3" /> : <ArrowRight className={cn("h-3 w-3", active ? "text-primary" : "text-slate-400")} />}
      </div>
      <span className="font-semibold">{label}</span>
      <span className="ml-auto font-mono tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

export function QueueStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-semibold normal-case tracking-normal text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-slate-950">{value.toLocaleString()}</p>
    </div>
  );
}

export function StateBlock({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      tone === "success"
        ? "border-success/20 bg-success/5"
        : "border-slate-200/80 bg-slate-50",
    )}>
      <p className={cn(
        "text-xs font-semibold normal-case tracking-normal",
        tone === "success" ? "text-success" : "text-slate-500",
      )}>{label}</p>
      <p className={cn(
        "mt-2 text-lg font-semibold tracking-[-0.03em]",
        tone === "success" ? "text-success" : "text-slate-950",
      )}>{value}</p>
    </div>
  );
}

export function EmptyTableState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-base font-semibold tracking-[-0.03em] text-slate-950">{title}</p>
        <p className="text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  );
}

export function PreviewGroupList({ entries }: { entries: Array<[string, number]> }) {
  return (
    <div className="space-y-2">
      {entries.slice(0, 4).map(([key, count]) => (
        <div key={key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="min-w-0 text-xs font-semibold leading-5 tracking-[-0.01em] text-slate-700">{key}</p>
          <Badge variant="outline" className="shrink-0 rounded-full border-slate-200 bg-slate-50 text-[11px] normal-case tracking-normal text-slate-600">
            {count}
          </Badge>
        </div>
      ))}
      {entries.length > 4 ? (
        <p className="text-xs font-medium normal-case tracking-normal text-slate-500">+{entries.length - 4} more group(s)</p>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const comboboxOptions = useMemo(() => options.map((opt) => ({ value: opt, label: opt })), [options]);

  return (
    <label className="grid gap-1.5 text-sm font-semibold normal-case tracking-normal text-slate-500">
      {label}
      <SearchableCombobox
        value={value}
        onValueChange={onChange}
        options={comboboxOptions}
        placeholder={`Select ${label.toLowerCase()}...`}
        className="h-11 bg-white"
      />
    </label>
  );
}

export function FlagBadge({
  label,
  tone,
}: {
  label: string;
  tone: "default" | "warning" | "success" | "danger";
}) {
  const classes =
    tone === "warning"
      ? "bg-warning/10 text-warning"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : "bg-slate-100 text-slate-600";

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-xs font-semibold normal-case tracking-normal", classes)}>
      {label}
    </Badge>
  );
}

export function MiniAction({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "primary" | "danger" | "neutral";
  onClick: () => void;
}) {
  const classes =
    tone === "primary"
      ? "border-primary/20 bg-primary/5 text-primary hover:border-primary/30 hover:bg-primary/10"
      : tone === "danger"
        ? "border-destructive/20 bg-destructive/5 text-destructive hover:border-destructive/30 hover:bg-destructive/10"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950";

  return (
    <Button
      type="button"
      variant={tone === "danger" ? "destructive" : tone === "primary" ? "secondary" : "outline"}
      size="xs"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 text-xs font-semibold normal-case tracking-normal transition-all active:translate-y-px",
        classes,
      )}
    >
      {label}
    </Button>
  );
}
