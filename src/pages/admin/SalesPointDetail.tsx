import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Archive, MapPin, MoreHorizontal, PlusCircle, Power, Save, Trash2, UserPlus } from "lucide-react";

import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AllocationStatusBadge, PodStatusBadge } from "@/components/domain/badges/badges";
import type { MasterDataStatus, SalesPointContactRole, SalesPointEntityType } from "@/lib/types/v2/status";
import { useAllocations } from "@/lib/v2/allocationStore";
import { useDeliveryConfirmations } from "@/lib/v2/podStore";
import { useSalesPoints, updateSalesPoint, updateSalesPointContact, removeSalesPointContact, addSalesPointContact } from "@/lib/v2/salesPointStore";
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

  const [form, setForm] = useState(() => ({
    name: "",
    status: "" as MasterDataStatus | "",
    entityType: "" as SalesPointEntityType | "",
    zone: "",
    region: "",
    area: "",
    subArea: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
    deliveryInstructions: "",
    companyName: "",
  }));

  const initialized = useRef(false);
  const prevId = useRef(id);
  if (id !== prevId.current) {
    prevId.current = id;
    initialized.current = false;
  }
  if (salesPoint && !initialized.current) {
    initialized.current = true;
    setForm({
      name: salesPoint.name,
      status: salesPoint.status,
      entityType: salesPoint.entityType ?? "",
      zone: salesPoint.geography.zone,
      region: salesPoint.geography.region,
      area: salesPoint.geography.area,
      subArea: salesPoint.geography.subArea,
      address: salesPoint.address.line1,
      city: salesPoint.address.city ?? "",
      province: salesPoint.address.province ?? "",
      postalCode: salesPoint.address.postalCode ?? "",
      country: salesPoint.address.country,
      deliveryInstructions: salesPoint.deliveryInstructions ?? "",
      companyName: salesPoint.companyName,
    });
  }

  const handleSave = () => {
    if (!salesPoint) return;
    try {
      updateSalesPoint(
        salesPoint.id,
        {
          name: form.name,
          companyName: form.companyName,
          status: (form.status || undefined) as MasterDataStatus | undefined,
          entityType: form.entityType ? (form.entityType as SalesPointEntityType) : null,
          geography: {
            zone: form.zone,
            region: form.region,
            area: form.area,
            subArea: form.subArea,
          },
          address: {
            line1: form.address,
            city: form.city || undefined,
            province: form.province || undefined,
            postalCode: form.postalCode || undefined,
            country: form.country,
            fullAddress: salesPoint.address.fullAddress,
          },
          deliveryInstructions: form.deliveryInstructions || null,
          expectedVersion: salesPoint.version,
        },
        { actorUserId: "admin-user", actorRole: "ADMIN", idempotencyKey: `sp-edit-${salesPoint.id}-${Date.now()}` },
      );
      initialized.current = false;
    } catch {
      // validation errors are surfaced by the store
    }
  };

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

  const handleToggleStatus = () => {
    const nextStatus: MasterDataStatus = salesPoint.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      updateSalesPoint(
        salesPoint.id,
        { status: nextStatus, expectedVersion: salesPoint.version },
        { actorUserId: "admin-user", actorRole: "ADMIN", idempotencyKey: `sp-status-${salesPoint.id}-${Date.now()}` },
      );
      initialized.current = false;
      toast.success(`Sales point ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleArchive = () => {
    try {
      updateSalesPoint(
        salesPoint.id,
        { status: "INACTIVE", expectedVersion: salesPoint.version },
        { actorUserId: "admin-user", actorRole: "ADMIN", idempotencyKey: `sp-archive-${salesPoint.id}-${Date.now()}` },
      );
      initialized.current = false;
      toast.success("Sales point archived.");
    } catch {
      toast.error("Failed to archive.");
    }
  };

  const handleAddPic = () => {
    try {
      addSalesPointContact(
        salesPoint.id,
        { name: "New PIC", role: "OTHER" as SalesPointContactRole },
        { actorUserId: "admin-user", actorRole: "ADMIN", idempotencyKey: `sp-contact-add-${salesPoint.id}-${Date.now()}` },
      );
      toast.success("PIC added.");
    } catch {
      toast.error("Failed to add PIC.");
    }
  };

  const headerActions = (
    <>
      <Button variant="outline" size="sm" onClick={handleToggleStatus}>
        <Power className="h-4 w-4" />
        {salesPoint.status === "ACTIVE" ? "Deactivate" : "Activate"}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={handleAddPic}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add PIC
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleArchive} className="text-destructive focus:text-destructive">
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <ContentArea>
        <Header title={salesPoint.name} actions={headerActions} />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
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

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">PICs ({salesPoint.contacts.length})</TabsTrigger>
              <TabsTrigger value="allocations">Allocations ({spAllocations.length})</TabsTrigger>
              <TabsTrigger value="shipments">Shipment History ({spBatches.length})</TabsTrigger>
              <TabsTrigger value="pod">Proof of Delivery (POD) History ({spConfirmations.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" />
                      Sales Point Information
                    </CardTitle>
                    <CardDescription>Edit sales point master data</CardDescription>
                  </div>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Name">
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field label="WCode">
                      <Input value={salesPoint.wCode} disabled className="font-mono text-muted-foreground" />
                    </Field>
                    <Field label="Code">
                      <Input value={salesPoint.code} disabled className="font-mono text-muted-foreground" />
                    </Field>
                    <Field label="Status">
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MasterDataStatus })}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="NEEDS_REVIEW">Needs Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Entity Type">
                      <Select value={form.entityType} onValueChange={(v) => setForm({ ...form, entityType: v as SalesPointEntityType })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DPC">DPC</SelectItem>
                          <SelectItem value="RETAIL">Retail</SelectItem>
                          <SelectItem value="DISTRIBUTION_POINT">Distribution Point</SelectItem>
                          <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                          <SelectItem value="OFFICE">Office</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Client Name">
                      <Input value={salesPoint.clientName} disabled className="text-muted-foreground" />
                    </Field>
                    <Field label="Company Name">
                      <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Operating company" />
                    </Field>
                    <Field label="Delivery Instructions" className="md:col-span-2">
                      <Textarea value={form.deliveryInstructions} onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })} className="min-h-20" />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Geography
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Zone"><Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></Field>
                    <Field label="Region"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
                    <Field label="Area"><Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Field>
                    <Field label="Sub-Area"><Input value={form.subArea} onChange={(e) => setForm({ ...form, subArea: e.target.value })} /></Field>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Address" className="md:col-span-2">
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </Field>
                    <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
                    <Field label="Province"><Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
                    <Field label="Postal Code"><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></Field>
                    <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {salesPoint.contacts.length} PIC{salesPoint.contacts.length !== 1 ? "s" : ""} on file.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!salesPoint) return;
                    try {
                      addSalesPointContact(
                        salesPoint.id,
                        { name: "New PIC", role: "OTHER" as SalesPointContactRole },
                        { actorUserId: "admin-user", actorRole: "ADMIN", idempotencyKey: `sp-contact-add-${salesPoint.id}-${Date.now()}` },
                      );
                    } catch { /* noop */ }
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  Add PIC
                </Button>
              </div>

              {salesPoint.contacts.length === 0 ? (
                <Card className="border-border/70 shadow-sm">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No PICs on file.
                  </CardContent>
                </Card>
              ) : (
                salesPoint.contacts.map((contact) => (
                  <Card key={contact.id} className="border-border/70 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-3">
                      <CardTitle className="text-sm font-medium">
                        {contact.name}
                        {contact.isPrimary ? (
                          <Badge variant="success" className="ml-2 rounded-full text-[10px]">Primary</Badge>
                        ) : null}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            if (!salesPoint) return;
                            try {
                              removeSalesPointContact(salesPoint.id, contact.id, {
                                actorUserId: "admin-user",
                                actorRole: "ADMIN",
                                idempotencyKey: `sp-contact-rm-${contact.id}-${Date.now()}`,
                              });
                            } catch { /* noop */ }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <PicFields contact={contact} salesPointId={salesPoint.id} />
                    </CardContent>
                  </Card>
                ))
              )}
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
                          <TableHead>Proof of Delivery (POD)</TableHead>
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
                  <CardTitle className="text-base">Proof of Delivery (POD) History</CardTitle>
                  <CardDescription>Delivery confirmations recorded at this Sales Point.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {spConfirmations.length === 0 ? (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">No Proof of Delivery (POD) records.</p>
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

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PicFields({
  contact,
  salesPointId,
}: {
  contact: { id: string; name: string; role: SalesPointContactRole; phone?: string; email?: string; isPrimary: boolean; notes?: string };
  salesPointId: string;
}) {
  const [form, setForm] = useState({
    name: contact.name,
    role: contact.role,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    isPrimary: contact.isPrimary,
    notes: contact.notes ?? "",
  });

  const handleSave = () => {
    try {
      updateSalesPointContact(salesPointId, contact.id, {
        name: form.name,
        role: form.role,
        phone: form.phone || undefined,
        email: form.email || undefined,
        isPrimary: form.isPrimary,
        notes: form.notes || undefined,
      }, {
        actorUserId: "admin-user",
        actorRole: "ADMIN",
        idempotencyKey: `sp-contact-edit-${contact.id}-${Date.now()}`,
      });
    } catch { /* noop */ }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as SalesPointContactRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ARA">ARA</SelectItem>
              <SelectItem value="SRE">SRE</SelectItem>
              <SelectItem value="SPV_DPC">SPV DPC</SelectItem>
              <SelectItem value="RECEIVER">Receiver</SelectItem>
              <SelectItem value="LOGISTICS">Logistics</SelectItem>
              <SelectItem value="CLIENT_PIC">Client PIC</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
      <div className="flex items-center justify-between border-t pt-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
            className="h-4 w-4 rounded border-input"
          />
          Primary PIC
        </label>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
