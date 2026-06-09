import { useMemo, useState } from "react";
import { Building2, Mail, MapPin, MoreHorizontal, Phone, Plus, Search, Trash2, User } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Client, useClientStore } from "@/lib/clientStore";
import { mockSalesPoints } from "@/lib/mockData";
import { useUserStore } from "@/lib/userStore";
import { ClientModal } from "./ClientModal";

function formatShippingAddress(client: Client) {
  const { address, city, province, postalCode, country } = client.shippingAddress;
  return [address, city, province, postalCode, country].filter(Boolean).join(", ");
}

export function ClientList() {
  const { clients, addClient, updateClient, deleteClient } = useClientStore();
  const { users } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) =>
      [
        client.name,
        client.entityName,
        client.email,
        client.phone,
        client.npwp,
        client.additionalInfo,
        formatShippingAddress(client),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [clients, searchQuery]);

  const handleSave = (clientData: Omit<Client, "id"> | Client) => {
    if ("id" in clientData) {
      updateClient(clientData.id, clientData);
    } else {
      addClient(clientData);
    }

    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this client record? The linked user will remain, but the client master data will be removed.")) {
      deleteClient(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <ContentArea>
        <Header title="Client Management" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, entity, contact, or address..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setSelectedClient(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </section>

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Bound User</TableHead>
                    <TableHead>Sales Points</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const linkedUser = users.find((user) => user.id === client.linkedUserId);
                    const boundSalesPoints = mockSalesPoints.filter((salesPoint) => salesPoint.clientId === client.id);

                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary/5 text-primary">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{client.entityName}</p>
                              {client.npwp ? (
                                <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">NPWP: {client.npwp}</p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {linkedUser ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {linkedUser.name}
                              </div>
                              <p className="text-xs text-muted-foreground">{linkedUser.email}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No linked user</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{boundSalesPoints.length}</p>
                            <p className="text-xs text-muted-foreground">
                              {boundSalesPoints.length === 1 ? "sales point" : "sales points"} bound to this client
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phone || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{formatShippingAddress(client) || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit Client
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                        No clients found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClient(null);
        }}
        onSave={handleSave}
        client={selectedClient}
      />
    </div>
  );
}
