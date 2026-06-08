import { useMemo, useState } from "react";
import { AlertTriangle, Eye, Factory, Mail, MoreHorizontal, Phone, Plus, Search, Trash2, User } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/supplierStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { SupplierModal } from "./SupplierModal";

export function SupplierList() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.picName,
        supplier.phone,
        supplier.email,
        supplier.type,
        supplier.status,
        ...(supplier.addressLines ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery, suppliers]);

  const handleSave = (supplierData: Omit<Supplier, "id"> | Supplier) => {
    if ("id" in supplierData) {
      updateSupplier(supplierData.id, supplierData);
    } else {
      addSupplier(supplierData);
    }

    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this supplier? Existing order references will keep the supplier name, but the record will be removed from this directory.")) {
      deleteSupplier(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Supplier Management" />

        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardDescription>Supplier Directory</CardDescription>
                  <CardTitle className="mt-2 text-xl">Manage supplier records in one place</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Search, create, edit, and remove vendor records used across order assignment and delivery-note references.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedSupplier(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Register New Supplier
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total suppliers" value={suppliers.length} />
                <StatCard label="Active" value={suppliers.filter((supplier) => supplier.status === "ACTIVE").length} />
                <StatCard label="Inactive" value={suppliers.filter((supplier) => supplier.status === "INACTIVE").length} />
                <StatCard label="With address" value={suppliers.filter((supplier) => (supplier.addressLines?.length ?? 0) > 0).length} />
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-muted/20 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">CRUD behavior</CardTitle>
                <CardDescription>Changes persist locally and update supplier references across the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                  <p>The assign-supplier dropdown updates immediately after each save or delete.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                    Search by company, PIC, email, or phone
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                    Inline row actions
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[10px] uppercase tracking-[0.24em]">
                    Confirmation before delete
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by company, PIC, contact, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline" className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
              <Eye className="h-3.5 w-3.5" />
              Live local CRUD
            </Badge>
          </section>

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Supplier List</CardTitle>
              <CardDescription>{filteredSuppliers.length} records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact PIC</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary/5 text-primary">
                            <Factory className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{supplier.name}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                              {supplier.type} · {supplier.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {supplier.picName}
                        </div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.addressLines?.length ? (
                          <div className="max-w-xs space-y-1 text-xs text-muted-foreground">
                            {supplier.addressLines.slice(0, 2).map((line, index) => (
                              <p key={`${supplier.id}-${index}`} className="truncate">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={supplier.status === "ACTIVE" ? "Accepted" : "Waiting"} />
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
                                setSelectedSupplier(supplier);
                                setIsModalOpen(true);
                              }}
                            >
                              Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(supplier.id)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Supplier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSave={handleSave}
        supplier={selectedSupplier}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
