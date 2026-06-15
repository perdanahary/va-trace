import { useMemo, useState } from "react";
import { AlertTriangle, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OPERATIONAL_EXCEPTION_STATUSES } from "@/lib/types/v2/status";
import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useOperationalExceptions } from "@/lib/v2/exceptionStore";

interface ExceptionListProps {
  userRole?: UserRole;
}

const severityVariant = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
} as const;

/** P2-19 — Admin operational exceptions register (`/admin/exceptions`). */
export function ExceptionList({ userRole = "admin" }: ExceptionListProps) {
  const exceptions = useOperationalExceptions();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [blockingFilter, setBlockingFilter] = useState("all");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return exceptions.filter((exception) => {
      if (statusFilter !== "all" && exception.status !== statusFilter) return false;
      if (blockingFilter === "blocking" && !exception.blocking) return false;
      if (blockingFilter === "nonblocking" && exception.blocking) return false;
      if (!term) return true;
      return [
        exception.exceptionNumber,
        exception.type,
        exception.title,
        exception.description,
        exception.sourceEntityType,
        exception.sourceEntityId,
        exception.ownerRole,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [blockingFilter, exceptions, search, statusFilter]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Exceptions" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by exception, source, or owner..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {OPERATIONAL_EXCEPTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={blockingFilter} onValueChange={setBlockingFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All blockers</SelectItem>
                  <SelectItem value="blocking">Blocking only</SelectItem>
                  <SelectItem value="nonblocking">Non-blocking only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Operational Exceptions Register</CardTitle>
              <CardDescription>Open blockers, Proof of Delivery (POD) variances, document corrections, and resolved exceptions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">No exceptions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exception</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((exception) => (
                        <TableRow key={exception.id}>
                          <TableCell>
                            <div className="flex min-w-72 items-start gap-2">
                              <AlertTriangle
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  exception.blocking ? "text-destructive" : "text-warning",
                                )}
                              />
                              <div>
                                <p className="font-mono text-xs font-medium">{exception.exceptionNumber}</p>
                                <p className="mt-1 text-sm font-medium">{exception.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{exception.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatStatusLabel(exception.type)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{formatStatusLabel(exception.sourceEntityType)}</div>
                            {exception.sourceEntityType === "SHIPMENT_BATCH" ? (
                              <Link to={`/${userRole}/shipments/${exception.sourceEntityId}`} className="font-mono text-link hover:underline">
                                {exception.sourceEntityId}
                              </Link>
                            ) : (
                              <span className="font-mono text-muted-foreground">{exception.sourceEntityId}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{formatStatusLabel(exception.ownerRole)}</TableCell>
                          <TableCell>
                            <Badge variant={severityVariant[exception.severity]}>{formatStatusLabel(exception.severity)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={exception.status === "RESOLVED" || exception.status === "WAIVED" ? "success" : "secondary"}>
                              {formatStatusLabel(exception.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{exception.updatedAt.slice(0, 10)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
