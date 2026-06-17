/**
 * Shared formatting utilities extracted from duplicated private implementations.
 *
 * Sources consolidated:
 *  - src/components/domain/tables/OrderRequestTable.tsx (formatDate)
 *  - src/lib/v2/notificationStore.ts (formatDate, formatTimestamp)
 *  - src/pages/vendor/VendorDashboard.tsx (formatCreatedDate, getDeadlineInfo)
 */

/**
 * Format an ISO date string to a short human-readable form.
 * Falls back to the raw value when the date is unparseable.
 */
export function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Format an ISO timestamp to a verbose form with time.
 */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface DeadlineInfo {
  label: string;
  isOverdue: boolean;
  daysLeft: number | null;
}

/**
 * Build a human-readable deadline label from an ISO deadline date (and
 * optionally a created-date fallback when the deadline text is "Overdue").
 *
 * Returns `{ label, isOverdue, daysLeft }` suitable for deadline columns.
 */
export function formatDeadlineInfo(deadline: string, createdDate?: string): DeadlineInfo {
  const now = new Date();
  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const parsedDate = new Date(deadline);
  if (!Number.isNaN(parsedDate.getTime()) && deadline.includes(parsedDate.getFullYear().toString())) {
    const diffMs = normalizeDate(parsedDate).getTime() - normalizeDate(now).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return { label: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`, isOverdue: false, daysLeft: diffDays };
    }
    if (diffDays === 0) {
      return { label: "Due today", isOverdue: false, daysLeft: 0 };
    }
    const overdue = Math.abs(diffDays);
    return { label: `${overdue} day${overdue !== 1 ? "s" : ""} overdue`, isOverdue: true, daysLeft: null };
  }

  if (deadline === "Overdue" && createdDate) {
    const parsedCreated = new Date(createdDate);
    if (!Number.isNaN(parsedCreated.getTime())) {
      const daysSince = Math.floor(
        (normalizeDate(now).getTime() - normalizeDate(parsedCreated).getTime()) / (1000 * 60 * 60 * 24),
      );
      return { label: `${daysSince} days overdue`, isOverdue: true, daysLeft: null };
    }
  }
  if (deadline === "Overdue") {
    return { label: "Overdue", isOverdue: true, daysLeft: null };
  }
  const daysLeftMatch = deadline.match(/(\d+)/);
  const daysLeft = daysLeftMatch ? Number(daysLeftMatch[1]) : null;
  return { label: deadline, isOverdue: false, daysLeft };
}
