import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeliveryNoteTable } from "@/components/domain/tables/DeliveryNoteTable";
import { DELIVERY_NOTE_STATUSES } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useDeliveryNoteRows } from "@/lib/v2/selectors/viewModels";

interface DeliveryNoteListProps {
  userRole?: UserRole;
}

/** P2-19 — Delivery Notes register (`/admin/delivery-notes`, `/vendor/delivery-notes`). */
export function DeliveryNoteList({ userRole = "admin" }: DeliveryNoteListProps) {
  const rolePrefix = `/${userRole}`;
  const rows = useDeliveryNoteRows(rolePrefix);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [missingPodOnly, setMissingPodOnly] = useState<string>("all");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (missingPodOnly === "missing" && !row.missingPod) return false;
      if (!term) return true;
      return [row.deliveryNoteNumber, row.batchNumber, row.orderRequestNumber, row.clientPoNumber ?? "", row.vendorName]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, statusFilter, missingPodOnly]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Delivery Notes" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by DN number, batch, order, client PO..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="DN status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {DELIVERY_NOTE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={missingPodOnly} onValueChange={setMissingPodOnly}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All POD states</SelectItem>
                  <SelectItem value="missing">Missing POD only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Delivery Notes Register</CardTitle>
              <CardDescription>
                Batch-scoped logistics documents. One order may have multiple Delivery Notes through its batches.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DeliveryNoteTable rows={filteredRows} />
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
