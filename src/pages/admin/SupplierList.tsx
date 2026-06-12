import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Factory, Mail, MoreHorizontal, Phone, Plus, Search, Trash2, User } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Supplier } from "@/lib/supplierStore";
import { useSupplierStore } from "@/lib/supplierStore";

export function SupplierList() {
  const navigate = useNavigate();
  const { suppliers, deleteSupplier } = useSupplierStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const visibleSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [currentPage, filteredSuppliers]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Delete this supplier? Existing order references will keep the supplier name, but the record will be removed from this directory.",
      )
    ) {
      deleteSupplier(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <ContentArea>
        <Header title="Supplier Management" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
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
            <Button onClick={() => navigate("/admin/suppliers/new")}>
              <Plus className="h-4 w-4" />
              Register New Supplier
            </Button>
          </section>

          <Card className="border-border/70 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact PIC</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSuppliers.map((supplier) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/suppliers/${supplier.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary/5 text-primary">
                            <Factory className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{supplier.name}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
                      <TableCell className="whitespace-nowrap text-center align-middle">
                        <StatusBadge status={supplier.status === "ACTIVE" ? "Active" : "Inactive"} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => navigate(`/admin/suppliers/${supplier.id}`)}>
                              Edit Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleDelete(supplier.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Supplier
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                        No suppliers found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredSuppliers.length)} of {filteredSuppliers.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <Button variant="outline" onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          </div>
        </main>
      </ContentArea>
    </div>
  );
}
