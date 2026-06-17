import { createCollectionStore } from "@/lib/v2/repository";
import type { ID } from "@/lib/types/v2/foundation";
import type { MessageCategory } from "@/lib/messages";
import { nowIso } from "@/lib/v2/ids";

export interface Notification {
  id: ID;
  subject: string;
  sender: string;
  senderLabel: string;
  date: string;
  timestamp: string;
  category: MessageCategory;
  unread: boolean;
  orderId?: ID;
  orderRequestNumber?: string;
  preview: string;
  body: string[];
  exceptionId: ID;
  relatedEntityType: string;
  relatedEntityId: ID;
  createdAt: string;
}

const store = createCollectionStore<Notification>({
  storageKey: "va-trace-v2-notifications",
  entityType: "NOTIFICATION",
});

export function useNotifications(): Notification[] {
  return store.useAll();
}

export function getNotifications(): Notification[] {
  return store.getAll();
}

export function getUnreadCount(): number {
  return store.getAll().filter((n) => n.unread).length;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function addNotification(options: {
  exceptionId: ID;
  orderId?: ID;
  orderRequestNumber?: string;
  relatedEntityType: string;
  relatedEntityId: ID;
  title: string;
  description: string;
  severity: string;
}): Notification {
  const now = nowIso();
  const notification: Notification = {
    id: `notif-${now.replace(/[:.]/g, "-")}-${options.exceptionId}`,
    subject: `Complaint: ${options.title}`,
    sender: "VA Trace Exception System",
    senderLabel: "System Notification",
    date: formatDate(now),
    timestamp: formatTimestamp(now),
    category: "Supplier",
    unread: true,
    orderId: options.orderId,
    orderRequestNumber: options.orderRequestNumber,
    preview: options.description,
    body: [
      "Notification to Supplier (Vendor)",
      "Trigger : Exception / Complaint",
      `Severity: ${options.severity}`,
      "",
      `A complaint has been opened against ${options.relatedEntityType} ${options.relatedEntityId}.`,
      "",
      `Title: ${options.title}`,
      `Description: ${options.description}`,
      options.orderRequestNumber ? `Order: ${options.orderRequestNumber}` : "",
      "",
      "Please review the reported discrepancy and arrange corrective action.",
    ].filter(Boolean),
    exceptionId: options.exceptionId,
    relatedEntityType: options.relatedEntityType,
    relatedEntityId: options.relatedEntityId,
    createdAt: now,
  };

  store.upsert(notification);
  return notification;
}

export function markNotificationRead(id: ID): void {
  store.upsert({ ...store.getById(id)!, unread: false } as Notification);
}

export function markAllNotificationsRead(): void {
  store.replaceAll(
    store.getAll().map((n) => (n.unread ? { ...n, unread: false } : n)),
  );
}
