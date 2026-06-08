import { useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Download, Mail, MailOpen, Printer, Search, Trash2 } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { inboxCategories, inboxMessages, type InboxMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";

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

  const selectedMessage = filteredMessages.find((message) => message.id === selectedMessageId) ?? filteredMessages[0] ?? null;
  const unreadCount = messages.filter((message) => message.unread).length;

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessageId(messageId);
    setMessages((current) => current.map((message) => (message.id === messageId ? { ...message, unread: false } : message)));
  };

  const handleMarkUnread = () => {
    if (!selectedMessage) return;
    setMessages((current) => current.map((message) => (message.id === selectedMessage.id ? { ...message, unread: true } : message)));
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
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title="Inbox" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-2 border-b">
              <CardTitle className="text-2xl">Inbox</CardTitle>
              <CardDescription>
                Supplier, logistics, and system messages related to your account and active order requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
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

                <div className="relative w-full max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search messages or order IDs" className="pl-9" />
                </div>
              </div>

              <Alert className="border-sky-200 bg-sky-50/70">
                <AlertTitle className="text-sky-900">Message summary</AlertTitle>
                <AlertDescription className="text-sky-800">
                  {filteredMessages.length} messages · {unreadCount} unread
                </AlertDescription>
              </Alert>

              <div className="grid min-h-[640px] grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border xl:grid-cols-[minmax(360px,0.98fr)_minmax(0,1.52fr)] xl:divide-x xl:divide-y-0">
                <section className="bg-background">
                  <div className="grid grid-cols-[32px_minmax(0,1fr)_140px] items-center border-b px-6 py-4 text-sm font-medium">
                    <div className="h-5 w-5 rounded border border-border bg-background" />
                    <span>Subject</span>
                    <span>Date</span>
                  </div>

                  <div className="divide-y divide-border">
                    {filteredMessages.length === 0 ? (
                      <EmptyState />
                    ) : (
                      filteredMessages.map((message) => {
                        const isActive = selectedMessage?.id === message.id;

                        return (
                          <button
                            key={message.id}
                            type="button"
                            onClick={() => handleSelectMessage(message.id)}
                            className={cn(
                              "grid w-full grid-cols-[32px_minmax(0,1fr)_140px] items-start gap-0 px-6 py-5 text-left transition-colors",
                              isActive ? "bg-primary/5" : "hover:bg-accent/30",
                            )}
                          >
                            <span className="pt-1">
                              {message.unread ? <Mail className="h-4 w-4 text-primary" /> : <MailOpen className="h-4 w-4 text-muted-foreground" />}
                            </span>
                            <span className="pr-6">
                              <span className="block truncate text-sm font-semibold">{message.subject}</span>
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

                <section className="bg-background">
                  {selectedMessage ? (
                    <div className="h-full">
                      <div className="border-b px-6 py-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14">
                              <AvatarFallback className="bg-orange-100 text-xl font-semibold text-orange-500">
                                {selectedMessage.sender.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                {selectedMessage.senderLabel}
                              </p>
                              <h3 className="mt-1 text-lg font-semibold">{selectedMessage.sender}</h3>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-10 w-10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Message actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleRemove} className="text-destructive focus:text-destructive">
                                Remove message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleMarkUnread}>Mark as unread</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="space-y-6 p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <h2 className="text-3xl font-semibold tracking-tight">{selectedMessage.subject}</h2>
                          </div>
                          <Button onClick={() => window.print()} className="self-start">
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <ActionButton icon={Mail} label="Reply" />
                          <ActionButton icon={CheckCheck} label="Mark as unread" onClick={handleMarkUnread} />
                          <ActionButton icon={Download} label="Save message" onClick={handleSave} />
                          <ActionButton icon={Trash2} label="Remove" onClick={handleRemove} />
                        </div>

                        <Separator />

                        <div className="grid gap-x-8 gap-y-4 md:grid-cols-[200px_minmax(0,1fr)]">
                          <DetailLabel label="Date" value={selectedMessage.timestamp} />
                          <DetailLabel label="Subject" value={selectedMessage.subject} />
                          {selectedMessage.orderId ? <DetailLabel label="Order ID" value={selectedMessage.orderId} mono /> : null}
                        </div>

                        <div className="rounded-xl border bg-muted/20 px-6 py-6">
                          <pre className="whitespace-pre-wrap font-mono text-[14px] leading-8 text-muted-foreground">
                            {selectedMessage.body.join("\n")}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </section>
              </div>
            </CardContent>
          </Card>
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
        className="min-w-[160px] appearance-none rounded-md border border-input bg-background py-2.5 pl-10 pr-10 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
    <Button type="button" variant="outline" onClick={onClick} className="h-11 rounded-lg">
      <Icon className="h-4 w-4" />
      {label}
    </Button>
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
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className={cn("text-sm text-muted-foreground", mono && "font-mono text-foreground")}>{value}</div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-16 text-center">
      <div>
        <p className="text-sm font-medium text-foreground">No messages match these filters.</p>
        <p className="mt-2 text-xs text-muted-foreground">Try clearing the search or switching the category.</p>
      </div>
    </div>
  );
}
