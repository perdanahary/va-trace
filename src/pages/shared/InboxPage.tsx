import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { inboxCategories, inboxMessages, type InboxMessage } from "@/lib/messages";
import {
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Download,
  Mail,
  MailOpen,
  Printer,
  Search,
  Trash2,
} from "lucide-react";

interface InboxPageProps {
  role: UserRole;
}

type DateFilter = "All time" | "Last 7 days" | "Last 30 days";

const dateFilters: DateFilter[] = ["All time", "Last 7 days", "Last 30 days"];

export function InboxPage({ role }: InboxPageProps) {
  const [messages, setMessages] = useState(inboxMessages);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<(typeof inboxCategories)[number]>("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>("All time");
  const [selectedMessageId, setSelectedMessageId] = useState(messages[0]?.id ?? "");

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        [message.subject, message.sender, message.preview, message.orderId]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "All" || message.category === selectedCategory;
      const matchesDateFilter =
        selectedDateFilter === "All time" ||
        (selectedDateFilter === "Last 7 days" && ["Jun 06, 2026", "Jun 05, 2026", "Jun 04, 2026", "Jun 02, 2026"].includes(message.date)) ||
        (selectedDateFilter === "Last 30 days" && message.date !== "Mar 14, 2026");

      return matchesSearch && matchesCategory && matchesDateFilter;
    });
  }, [messages, searchQuery, selectedCategory, selectedDateFilter]);

  const selectedMessage =
    filteredMessages.find((message) => message.id === selectedMessageId) ??
    filteredMessages[0] ??
    null;

  const unreadCount = messages.filter((message) => message.unread).length;

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, unread: false } : message
      )
    );
  };

  const handleMarkUnread = () => {
    if (!selectedMessage) return;
    setMessages((current) =>
      current.map((message) =>
        message.id === selectedMessage.id ? { ...message, unread: true } : message
      )
    );
  };

  const handleRemove = () => {
    if (!selectedMessage) return;

    const nextMessages = messages.filter((message) => message.id !== selectedMessage.id);
    setMessages(nextMessages);
    setSelectedMessageId(nextMessages[0]?.id ?? "");
  };

  const handleSave = () => {
    if (!selectedMessage) return;

    const blob = new Blob([selectedMessage.body.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMessage.subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title="Inbox" />

        <main className="w-full p-8 space-y-8">
          <section className="w-full bg-white border border-border rounded-xl overflow-hidden animate-in-smart">
            <div className="px-8 py-7 border-b border-border">
              <h2 className="text-[28px] font-semibold tracking-tight text-foreground">Inbox</h2>
              <p className="mt-4 text-sm text-muted-foreground max-w-3xl">
                This page contains supplier, logistics, and system messages related to your account and active order requests.
              </p>
            </div>

            <div className="px-8 py-5 border-b border-border">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                  <FilterSelect
                    icon={CalendarDays}
                    value={selectedDateFilter}
                    options={dateFilters}
                    onChange={(value) => setSelectedDateFilter(value as DateFilter)}
                  />
                  <FilterSelect
                    icon={Mail}
                    value={selectedCategory}
                    options={inboxCategories}
                    onChange={(value) => setSelectedCategory(value as (typeof inboxCategories)[number])}
                  />
                </div>

                <label className="relative block w-full max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search messages or order IDs"
                    className="w-full rounded-lg border border-border bg-white py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>
            </div>

            <div className="border-b border-border bg-[linear-gradient(90deg,rgba(34,197,246,0.14),rgba(34,197,246,0.02))] px-8 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              {filteredMessages.length} messages · {unreadCount} unread
            </div>

            <div className="grid min-h-[640px] grid-cols-1 divide-y divide-border xl:grid-cols-[minmax(360px,0.98fr)_minmax(0,1.52fr)] xl:divide-x xl:divide-y-0">
              <section className="overflow-hidden">
                <div className="grid grid-cols-[32px_minmax(0,1fr)_140px] items-center border-b border-border px-8 py-4 text-sm font-semibold text-foreground">
                  <div className="h-5 w-5 rounded border border-border bg-white" />
                  <span>Subject</span>
                  <span>Date</span>
                </div>

                <div className="divide-y divide-border">
                  {filteredMessages.length === 0 ? (
                    <div className="px-8 py-16 text-center">
                      <p className="text-sm font-medium text-foreground">No messages match these filters.</p>
                      <p className="mt-2 text-xs text-muted-foreground">Try clearing the search or switching the category.</p>
                    </div>
                  ) : (
                    filteredMessages.map((message) => {
                      const isActive = selectedMessage?.id === message.id;
                      return (
                        <button
                          key={message.id}
                          type="button"
                          onClick={() => handleSelectMessage(message.id)}
                          className={cn(
                            "grid w-full grid-cols-[32px_minmax(0,1fr)_140px] items-start gap-0 px-8 py-5 text-left transition-colors",
                            isActive ? "bg-sky-50/70" : "hover:bg-accent/20"
                          )}
                        >
                          <span className="pt-1">
                            {message.unread ? (
                              <Mail className="h-4 w-4 text-sky-600" />
                            ) : (
                              <MailOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span className="pr-6">
                            <span className="block truncate text-sm font-semibold text-foreground">{message.subject}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{message.sender}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{message.preview}</span>
                          </span>
                          <span className="text-sm text-muted-foreground">{message.date}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="bg-white">
                {selectedMessage ? (
                  <div className="h-full">
                    <div className="border-b-4 border-zinc-800 px-8 py-7">
                      <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-xl font-bold text-orange-500">
                            N
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {selectedMessage.senderLabel}
                            </p>
                            <h3 className="mt-1 text-[15px] font-semibold text-foreground">{selectedMessage.sender}</h3>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemove}
                          className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-accent/30 hover:text-foreground"
                          aria-label="Remove message"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="px-8 py-8">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <h2 className="text-[32px] font-medium tracking-tight text-foreground">{selectedMessage.subject}</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-2 self-start rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 btn-press"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <ActionButton icon={Mail} label="Reply" />
                        <ActionButton icon={CheckCheck} label="Mark as unread" onClick={handleMarkUnread} />
                        <ActionButton icon={Download} label="Save message" onClick={handleSave} />
                        <ActionButton icon={Trash2} label="Remove" onClick={handleRemove} />
                      </div>

                      <div className="mt-10 grid gap-x-8 gap-y-6 border-t border-border pt-8 md:grid-cols-[200px_minmax(0,1fr)]">
                        <DetailLabel label="Date" value={selectedMessage.timestamp} />
                        <DetailLabel label="Subject" value={selectedMessage.subject} />
                        {selectedMessage.orderId ? <DetailLabel label="Order ID" value={selectedMessage.orderId} mono /> : null}
                      </div>

                      <div className="mt-10 rounded-xl border border-border bg-canvas-white px-6 py-6">
                        <pre className="whitespace-pre-wrap font-mono text-[14px] leading-8 text-zinc-600">
                          {selectedMessage.body.join("\n")}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-8 py-16 text-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">Your inbox is empty.</p>
                      <p className="mt-2 text-xs text-muted-foreground">New supplier and system messages will appear here.</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

interface FilterSelectProps {
  icon: typeof CalendarDays;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function FilterSelect({ icon: Icon, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="relative inline-flex items-center">
      <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[160px] appearance-none rounded-lg border border-border bg-white py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
    </label>
  );
}

interface ActionButtonProps {
  icon: typeof Mail;
  label: string;
  onClick?: () => void;
}

function ActionButton({ icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-accent/30 hover:text-foreground btn-press"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

interface DetailLabelProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DetailLabel({ label, value, mono = false }: DetailLabelProps) {
  return (
    <>
      <div className="text-sm font-semibold text-zinc-700">{label}</div>
      <div className={cn("text-sm text-muted-foreground", mono && "font-mono text-foreground")}>{value}</div>
    </>
  );
}
