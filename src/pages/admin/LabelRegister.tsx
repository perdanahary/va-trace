import { useMemo, useState } from "react";
import { Filter, Printer, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ShippingLabelStatus } from "@/lib/types/v2/status";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";
import { useLabelState } from "@/lib/v2/labelStore";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";

interface LabelRegisterProps {
  userRole?: UserRole;
}

const LABEL_STATUSES = ["NOT_GENERATED", "GENERATED", "PRINTED", "REPRINTED", "VOIDED", "SUPERSEDED"] as const satisfies readonly ShippingLabelStatus[];

const labelVariant: Record<ShippingLabelStatus, "success" | "processing" | "warning" | "destructive" | "secondary"> = {
  NOT_GENERATED: "secondary",
  GENERATED: "processing",
  PRINTED: "success",
  REPRINTED: "warning",
  VOIDED: "destructive",
  SUPERSEDED: "secondary",
};

/** P2-19 — Shipping label register (`/admin/labels`). */
export function LabelRegister({ userRole = "admin" }: LabelRegisterProps) {
  const labelState = useLabelState();
  const batches = useShipmentBatches();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return labelState.labels.filter((label) => {
      if (statusFilter !== "all" && label.status !== statusFilter) return false;
      const batch = batchById.get(label.shipmentBatchId);
      if (!term) return true;
      return [
        label.labelNumber,
        batch?.batchNumber ?? label.shipmentBatchId,
        label.productCode,
        label.productName,
        label.destinationName,
        label.projectName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [batchById, labelState.labels, search, statusFilter]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title="Shipping Labels" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by label, batch, product, or destination..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LABEL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {formatStatusLabel(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Label Register</CardTitle>
              <CardDescription>Package labels generated from batch items and Sales Point snapshots.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">No shipping labels found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Prints</TableHead>
                        <TableHead>Last Printed</TableHead>
                        <TableHead className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((label) => {
                        const batch = batchById.get(label.shipmentBatchId);
                        return (
                          <TableRow key={label.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Printer className="h-3.5 w-3.5 text-primary" />
                                <span className="font-mono text-xs font-medium">{label.labelNumber}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/${userRole}/shipments/${label.shipmentBatchId}`}
                                className="font-mono text-xs text-link hover:underline"
                              >
                                {batch?.batchNumber ?? label.shipmentBatchId}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-medium">{label.productCode}</p>
                              <p className="text-xs text-muted-foreground">{label.productName}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{label.destinationName}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">{label.destinationAddress || "-"}</p>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {label.quantity} {label.unitOfMeasure}
                            </TableCell>
                            <TableCell>
                              <Badge variant={labelVariant[label.status]}>{formatStatusLabel(label.status)}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{label.printCount}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {label.lastPrintedAt ? label.lastPrintedAt.slice(0, 10) : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/${userRole}/shipments/${label.shipmentBatchId}/labels`}>Print</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
