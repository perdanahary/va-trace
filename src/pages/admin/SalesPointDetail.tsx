import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllocationStatusBadge, PodStatusBadge } from "@/components/domain/badges/badges";
import { useAllocations } from "@/lib/v2/allocationStore";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { useSalesPoints } from "@/lib/v2/salesPointStore";
import { useShipmentBatches } from "@/lib/v2/shipmentBatchStore";
import { formatStatusLabel } from "@/lib/v2/selectors/derivedStatus";

interface SalesPointDetailProps {
  userRole?: UserRole;
}

/** P2-15 — Sales Point detail: profile, contacts, allocations, shipment + POD history. */
export function SalesPointDetail({ userRole = "admin" }: SalesPointDetailProps) {
  const { id } = useParams<{ id: string }>();
  const salesPoints = useSalesPoints();
  const allocations = useAllocations();
  const batches = useShipmentBatches();
  const confirmations = useDeliveryConfirmations();

  const salesPoint = useMemo(
    () => salesPoints.find((entry) => entry.id === id || entry.wCode === id),
    [salesPoints, id],
  );

  const spAllocations = useMemo(
    () => allocations.filter((allocation) => allocation.salesPoint.id === salesPoint?.id),
    [allocations, salesPoint],
  );
  const spBatches = useMemo(
    () => batches.filter((batch) => batch.items.some((item) => item.salesPoint.salesPointId === salesPoint?.id)),
    [batches, salesPoint],
  );
  const spConfirmations = useMemo(
    () => confirmations.filter((confirmation) => confirmation.salesPointId === salesPoint?.id),
    [confirmations, salesPoint],
  );

  if (!salesPoint) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar userRole={userRole} />
        <ContentArea>
          <Header title="Sales Point" />
          <main className="p-8">
            <p className="text-sm text-muted-foreground">Sales Point not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to={`/${userRole}/sales-points`}>
                <ArrowLeft className="h-4 w-4" /> Back to Sales Points
              </Link>
            </Button>
          </main>
        </ContentArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={salesPoint.name} />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-base font-semibold">{salesPoint.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{salesPoint.wCode}</span>
              <Badge variant={salesPoint.status === "ACTIVE" ? "success" : "secondary"} className="rounded-full">
                {formatStatusLabel(salesPoint.status)}
              </Badge>
              <Badge
                variant={salesPoint.dataQuality.state === "COMPLETE" ? "success" : "warning"}
                className="rounded-full"
              >
                {formatStatusLabel(salesPoint.dataQuality.state)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {[salesPoint.geography.zone, salesPoint.geography.region, salesPoint.geography.area, salesPoint.geography.subArea]
                .filter(Boolean)
                .join(" · ")}
              {" · "}
              {salesPoint.clientName}
            </p>
            {salesPoint.address.fullAddress ? (
              <p className="text-sm text-muted-foreground">{salesPoint.address.fullAddress}</p>
            ) : null}
          </section>

          {salesPoint.dataQuality.warnings.length > 0 ? (
            <Alert>
              <AlertTitle>Data quality warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {salesPoint.dataQuality.warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts">Contacts ({salesPoint.contacts.length})</TabsTrigger>
              <TabsTrigger value="allocations">Allocations ({spAllocations.length})</TabsTrigger>
              <TabsTrigger value="shipments">Shipment History ({spBatches.length})</TabsTrigger>
              <TabsTrigger value="pod">POD History ({spConfirmations.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="contacts">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-0">
                  {salesPoint.contacts.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No contacts on file.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Primary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesPoint.contacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="text-sm font-medium">{contact.name}</TableCell>
                            <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                              {contact.role}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{contact.phone ?? "—"}</TableCell>
                            <TableCell className="text-xs">{contact.email ?? "—"}</TableCell>
                            <TableCell className="text-xs">{contact.isPrimary ? "Primary" : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allocations">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-0">
                  {spAllocations.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No allocations for this Sales Point.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Allocated</TableHead>
                          <TableHead className="text-right">Shipped</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>POD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spAllocations.map((allocation) => (
                          <TableRow key={allocation.id}>
                            <TableCell>
                              <Link
                                to={`/${userRole}/orders/${allocation.orderRequestId}`}
                                className="font-mono text-xs text-link hover:underline"
                              >
                                {allocation.orderRequestId}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-72 truncate text-sm">{allocation.product.name}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{allocation.allocatedQuantity}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{allocation.shippedQuantity}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{allocation.receivedQuantity}</TableCell>
                            <TableCell>
                              <AllocationStatusBadge status={allocation.status} />
                            </TableCell>
                            <TableCell>
                              <PodStatusBadge status={allocation.podStatus} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipments">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="p-0">
                  {spBatches.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No shipments to this Sales Point.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead className="text-right">Shipped</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead>Dispatched</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spBatches.map((batch) => {
                          const lines = batch.items.filter((item) => item.salesPoint.salesPointId === salesPoint.id);
                          const shipped = lines.reduce((total, item) => total + item.shippedQuantity, 0);
                          const received = lines.reduce((total, item) => total + item.verifiedReceivedQuantity, 0);
                          return (
                            <TableRow key={batch.id}>
                              <TableCell>
                                <Link
                                  to={`/${userRole}/shipments/${batch.id}`}
                                  className="font-mono text-xs text-link hover:underline"
                                >
                                  {batch.batchNumber}
                                </Link>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{batch.orderRequestNumber}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{shipped}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{received}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {batch.dispatchedAt ? batch.dispatchedAt.slice(0, 10) : "—"}
                              </TableCell>
                              <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                                {formatStatusLabel(batch.status)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pod">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">POD History</CardTitle>
                  <CardDescription>Delivery confirmations recorded at this Sales Point.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {spConfirmations.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No POD records.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DN Number</TableHead>
                          <TableHead>Receiver</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Verified</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spConfirmations.map((confirmation) => (
                          <TableRow key={confirmation.id}>
                            <TableCell className="font-mono text-xs">{confirmation.deliveryNoteNumber || "—"}</TableCell>
                            <TableCell className="text-sm">{confirmation.receiverName || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{confirmation.receivedDate}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {confirmation.quantitySummary.expectedShippedQuantity}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {confirmation.quantitySummary.verifiedReceivedQuantity}
                            </TableCell>
                            <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                              {formatStatusLabel(confirmation.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </ContentArea>
    </div>
  );
}
