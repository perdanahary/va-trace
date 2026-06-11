import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  ExternalLink,
  MapPin,
  Save,
  ShoppingCart,
  User,
} from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useClientStore } from "@/lib/clientStore";
import { useUserStore } from "@/lib/userStore";
import { mockSalesPoints } from "@/lib/mockData";
import { useOrders } from "@/lib/orderStore";

export function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, updateClient } = useClientStore();
  const { users } = useUserStore();
  const orders = useOrders();

  const client = clients.find((c) => c.id === id);

  const [form, setForm] = useState({
    name: "",
    entityName: "",
    npwp: "",
    email: "",
    phone: "",
    additionalInfo: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  const initialized = useRef(false);
  const prevId = useRef(id);
  if (id !== prevId.current) {
    prevId.current = id;
    initialized.current = false;
  }
  if (client && !initialized.current) {
    initialized.current = true;
    setForm({
      name: client.name,
      entityName: client.entityName,
      npwp: client.npwp,
      email: client.email,
      phone: client.phone,
      additionalInfo: client.additionalInfo,
      address: client.shippingAddress.address,
      city: client.shippingAddress.city,
      province: client.shippingAddress.province,
      postalCode: client.shippingAddress.postalCode,
    });
  }

  const linkedUser = useMemo(
    () => users.find((u) => u.id === client?.linkedUserId),
    [client?.linkedUserId, users],
  );

  const boundSalesPoints = useMemo(
    () => mockSalesPoints.filter((sp) => sp.clientId === id),
    [id],
  );

  const clientOrders = useMemo(
    () =>
      orders
        .filter((o) => o.clientId === id)
        .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()),
    [orders, id],
  );

  const handleSave = () => {
    if (!client) return;
    updateClient(client.id, {
      name: form.name,
      entityName: form.entityName,
      npwp: form.npwp,
      email: form.email,
      phone: form.phone,
      additionalInfo: form.additionalInfo,
      shippingAddress: {
        country: "Indonesia",
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
      },
    });
  };

  if (!client) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar role="admin" />
        <ContentArea>
          <Header title="Client Not Found" />
          <main className="p-4 sm:p-6 lg:p-8">
            <Card className="border-border/70 mx-auto max-w-lg shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <p className="text-muted-foreground">
                  Client with ID <span className="font-mono font-medium text-foreground">{id}</span> was not found.
                </p>
                <Button variant="outline" onClick={() => navigate("/admin/clients")}>
                  Back to Clients
                </Button>
              </CardContent>
            </Card>
          </main>
        </ContentArea>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <ContentArea>
        <Header
          title={client.name}
          breadcrumbs={[
            { label: "Clients", to: "/admin/clients" },
            { label: client.name },
          ]}
        />

        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Tabs defaultValue="overview">
            <TabsList className="mb-6">
              <TabsTrigger value="overview" className="gap-2">
                <Building2 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <User className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="addresses" className="gap-2">
                <MapPin className="h-4 w-4" />
                Addresses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      Client Information
                    </CardTitle>
                    <CardDescription>Edit client master data</CardDescription>
                  </div>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Client Name">
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </Field>
                    <Field label="Entity Name">
                      <Input
                        value={form.entityName}
                        onChange={(e) => setForm({ ...form, entityName: e.target.value })}
                      />
                    </Field>
                    <Field label="NPWP">
                      <Input
                        value={form.npwp}
                        onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                        className="font-mono"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </Field>
                    <Field label="Additional Info" className="md:col-span-2">
                      <Textarea
                        value={form.additionalInfo}
                        onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
                        className="min-h-20"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Address
                  </CardTitle>
                  <CardDescription>Shipping address for this client</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Address" className="md:col-span-2">
                      <Textarea
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="min-h-20"
                      />
                    </Field>
                    <Field label="City">
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </Field>
                    <Field label="Province">
                      <Input
                        value={form.province}
                        onChange={(e) => setForm({ ...form, province: e.target.value })}
                      />
                    </Field>
                    <Field label="Postal Code">
                      <Input
                        value={form.postalCode}
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      />
                    </Field>
                    <Field label="Country">
                      <Input value="Indonesia" disabled className="text-muted-foreground" />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Linked User
                  </CardTitle>
                  <CardDescription>User account bound to this client</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {linkedUser ? (
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium">{linkedUser.name}</p>
                        <p className="text-sm text-muted-foreground">{linkedUser.email}</p>
                        <p className="text-xs font-medium capitalize text-muted-foreground">
                          Role: {linkedUser.role}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No user linked to this client.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-4 w-4" />
                    Project History
                  </CardTitle>
                  <CardDescription>
                    {clientOrders.length} order{clientOrders.length !== 1 ? "s" : ""} linked to this client
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {clientOrders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Project / Campaign</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <span className="font-mono text-xs font-medium">{order.id}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{order.campaign}</span>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{order.createdDate}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{order.deadline}</TableCell>
                            <TableCell className="text-sm">{order.supplier}</TableCell>
                            <TableCell className="text-right">
                              <Button asChild variant="ghost" size="sm" className="gap-1">
                                <Link to={`/admin/orders/${order.id}`}>
                                  Details
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No orders found for this client.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="addresses">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Sales Points
                  </CardTitle>
                  <CardDescription>
                    {boundSalesPoints.length} sales point{boundSalesPoints.length !== 1 ? "s" : ""} bound to this client
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {boundSalesPoints.length > 0 ? (
                    <div className="divide-y rounded-lg border">
                      {boundSalesPoints.map((sp) => (
                        <div key={sp.wcode} className="flex items-center justify-between px-4 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/20">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{sp.salesPoint}</p>
                            <p className="text-xs text-muted-foreground">
                              {sp.wcode} &middot; {sp.zone} &middot; {sp.region} &middot; {sp.area}
                            </p>
                            {sp.address ? (
                              <p className="text-xs text-muted-foreground">{sp.address}</p>
                            ) : null}
                          </div>
                          <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                            {sp.wcode}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sales points bound to this client.</p>
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
