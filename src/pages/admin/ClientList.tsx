import { useMemo, useState } from "react";
import { Building2, Mail, MapPin, MoreHorizontal, Phone, Plus, Search, Trash2, User } from "lucide-react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Customer, useCustomerStore } from "@/lib/customerStore";
import { mockSalesPoints } from "@/lib/mockData";
import { useUserStore } from "@/lib/userStore";
import { CustomerModal } from "./CustomerModal";

function formatShippingAddress(customer: Customer) {
  const { address, city, province, postalCode, country } = customer.shippingAddress;
  return [address, city, province, postalCode, country].filter(Boolean).join(", ");
}

export function CustomerList() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore();
  const { users } = useUserStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.entityName,
        customer.email,
        customer.phone,
        customer.npwp,
        customer.additionalInfo,
        formatShippingAddress(customer),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, searchQuery]);

  const handleSave = (customerData: Omit<Customer, "id"> | Customer) => {
    if ("id" in customerData) {
      updateCustomer(customerData.id, customerData);
    } else {
      addCustomer(customerData);
    }

    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this customer record? The linked user will remain, but the customer master data will be removed.")) {
      deleteCustomer(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Customer Management" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, entity, contact, or address..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => {
                setSelectedCustomer(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </section>

          <Card className="border-border/70 py-0 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Bound User</TableHead>
                    <TableHead>Sales Points</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Shipping Address</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const linkedUser = users.find((user) => user.id === customer.linkedUserId);
                    const boundSalesPoints = mockSalesPoints.filter((salesPoint) => salesPoint.customerId === customer.id);

                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary/5 text-primary">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{customer.name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{customer.entityName}</p>
                              {customer.npwp ? (
                                <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">NPWP: {customer.npwp}</p>
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
                              {boundSalesPoints.length === 1 ? "sales point" : "sales points"} bound to this customer
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {customer.email || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{formatShippingAddress(customer) || "—"}</span>
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
                                  setSelectedCustomer(customer);
                                  setIsModalOpen(true);
                                }}
                              >
                                Edit Customer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(customer.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Customer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                        No customers found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSave}
        customer={selectedCustomer}
      />
    </div>
  );
}
