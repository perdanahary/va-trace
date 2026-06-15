import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { OrderRequestTable, type OrderRequestTableColumn } from "@/components/domain/tables/OrderRequestTable";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/lib/authStore";
import { useClientStore } from "@/lib/clientStore";
import { DISTRIBUTION_STATUSES, PRODUCTION_STATUSES } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useOrderListRows } from "@/lib/v2/selectors/viewModels";

const clientOrderColumns: OrderRequestTableColumn[] = [
  "clientPo",
  "orderRequest",
  "client",
  "project",
  "vendor",
  "created",
  "deadline",
  "production",
  "distribution",
  "progress",
  "exception",
];

const defaultHiddenColumns: OrderRequestTableColumn[] = ["client", "project", "exception"];

/** P2-19 — Client order list (`/client/orders`) backed by V2 order rows. */
export function ClientOrders() {
  const rows = useOrderListRows("/client");
  const { currentUser } = useCurrentUser();
  const { clients } = useClientStore();
  const linkedClient = useMemo(
    () => (currentUser ? clients.find((client) => client.linkedUserId === currentUser.id) : null),
    [clients, currentUser],
  );

  const [search, setSearch] = useState("");
  const [productionFilter, setProductionFilter] = useState("all");
  const [distributionFilter, setDistributionFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<OrderRequestTableColumn[]>(
    clientOrderColumns.filter((col) => !defaultHiddenColumns.includes(col))
  );

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const clientName = linkedClient?.entityName ?? currentUser?.company;

    return rows
      .filter((row) => {
        if (clientName && row.clientName !== clientName) return false;
        if (productionFilter !== "all" && row.productionStatus !== productionFilter) return false;
        if (distributionFilter !== "all" && row.distributionStatus !== distributionFilter) return false;
        if (!term) return true;
        return [
          row.orderRequestNumber,
          row.clientPoNumber ?? "",
          row.projectName,
          row.vendorName,
          row.legacyStatusLabel,
          row.tags?.join(" ") ?? "",
          row.referenceLink?.displayTitle ?? row.referenceLink?.url ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .map((row) => ({
        ...row,
        actionTargets: { ...row.actionTargets, detailPath: `/client/orders/${row.id}` },
      }));
  }, [currentUser, distributionFilter, linkedClient, productionFilter, rows, search]);

  const handleColumnToggle = (column: OrderRequestTableColumn) => {
    setVisibleColumns((prev) =>
      prev.includes(column) ? prev.filter((col) => col !== column) : [...prev, column]
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="client" />
      <ContentArea>
        <Header title="My Orders" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order, client PO, project, or vendor..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={productionFilter} onValueChange={setProductionFilter}>
                <SelectTrigger className="w-52">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Production status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All production</SelectItem>
                  {PRODUCTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={distributionFilter} onValueChange={setDistributionFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Distribution status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All distribution</SelectItem>
                  {DISTRIBUTION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ColumnToggle
                columns={clientOrderColumns}
                visibleColumns={visibleColumns}
                onToggle={handleColumnToggle}
              />
            </div>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Order Requests</CardTitle>
              <CardDescription>Client-visible production, distribution, and POD progress.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <OrderRequestTable rows={visibleRows} columns={visibleColumns} detailLabel="Track" />
            </CardContent>
          </Card>
        </main>
      </ContentArea>
    </div>
  );
}
