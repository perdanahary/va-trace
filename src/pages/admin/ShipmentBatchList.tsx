import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateBatchDialog } from "@/components/domain/dialogs/CreateBatchDialog";
import { ShipmentBatchTable } from "@/components/domain/tables/ShipmentBatchTable";
import { SHIPMENT_BATCH_STATUSES } from "@/lib/types/v2/status";
import { useActor } from "@/lib/v2/useActor";
import { useHydratedOrders, useShipmentBatchRows } from "@/lib/v2/selectors/viewModels";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";

interface ShipmentBatchListProps {
  userRole?: UserRole;
}

/** P2-14 — Shipment Batch list (`/admin/shipments`, `/vendor/shipments`). */
export function ShipmentBatchList({ userRole = "admin" }: ShipmentBatchListProps) {
  const rolePrefix = `/${userRole}`;
  const actor = useActor(userRole, "shipment-batch-list");
  const rows = useShipmentBatchRows(rolePrefix);
  const orders = useHydratedOrders();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!term) return true;
      return [row.batchNumber, row.orderRequestNumber, row.clientPoNumber ?? "", row.vendorName, row.projectName]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [rows, search, statusFilter]);

  const ordersWithOutstanding = useMemo(
    () =>
      orders.filter((entry) =>
        entry.allocations.some((allocation) => allocation.outstandingQuantity > 0 && allocation.status !== "CANCELLED"),
      ),
    [orders],
  );
  const selectedOrder = ordersWithOutstanding.find((entry) => entry.order.id === selectedOrderId);
  const canCreate = userRole === "admin" || userRole === "operator" || userRole === "vendor";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Shipment Batches" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by batch, order, client PO, vendor..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Batch status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SHIPMENT_BATCH_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate ? (
                <>
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select order to ship" />
                    </SelectTrigger>
                    <SelectContent>
                      {ordersWithOutstanding.map((entry) => (
                        <SelectItem key={entry.order.id} value={entry.order.id}>
                          {entry.order.orderRequestNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setCreateOpen(true)} disabled={!selectedOrderId}>
                    Create Batch
                  </Button>
                </>
              ) : null}
            </div>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Shipment Batches</CardTitle>
              <CardDescription>
                Physical shipment events. Every shipped quantity, Delivery Note, and Proof of Delivery (POD) belongs to a batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ShipmentBatchTable rows={filteredRows} />
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      <CreateBatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        order={selectedOrder}
        actor={actor}
      />
    </div>
  );
}
