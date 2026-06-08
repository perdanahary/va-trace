import { useMemo, useState } from "react";
import { Search, Plus, MoreVertical, Factory, Phone, Mail, User, Edit2, Trash2, Eye, AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/lib/supplierStore";
import { useSupplierStore } from "@/lib/supplierStore";
import { SupplierModal } from "./SupplierModal";

export function SupplierList() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSupplierStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) => {
      const haystack = [
        supplier.name,
        supplier.picName,
        supplier.phone,
        supplier.email,
        supplier.type,
        supplier.status,
        ...(supplier.addressLines ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
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

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (
      confirm(
        "Delete this supplier? Existing order references will keep the supplier name, but the record will be removed from this directory.",
      )
    ) {
      deleteSupplier(id);
    }

    setActiveMenuId(null);
  };

  return (
    <div className="flex min-h-screen bg-canvas-white font-sans">
      <Sidebar role="admin" />
      <div className="flex-1">
        <Header title="Supplier Management" />

        <main className="space-y-6 p-8">
          <section className="grid gap-4 animate-in-smart lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Supplier Directory
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight">Manage supplier records in one place</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Search, create, edit, and remove vendor records used across order assignment and delivery-note
                    references.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSupplier(null);
                    setIsModalOpen(true);
                  }}
                  className="btn-press flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Register New Supplier
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total suppliers" value={suppliers.length.toString()} />
                <StatCard
                  label="Active"
                  value={suppliers.filter((supplier) => supplier.status === "ACTIVE").length.toString()}
                />
                <StatCard
                  label="Inactive"
                  value={suppliers.filter((supplier) => supplier.status === "INACTIVE").length.toString()}
                />
                <StatCard
                  label="With address"
                  value={suppliers.filter((supplier) => (supplier.addressLines?.length ?? 0) > 0).length.toString()}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CRUD behavior</p>
                  <p className="text-sm text-foreground">
                    Changes persist in browser storage and immediately update the assign-supplier dropdown used elsewhere
                    in the app.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Search by company, PIC, email, or phone</Pill>
                <Pill>Inline row actions</Pill>
                <Pill>Confirmation before delete</Pill>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between animate-in-smart">
            <div className="group relative w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="text"
                placeholder="Search suppliers by company, PIC, contact, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none transition-all focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
              <Eye className="h-3.5 w-3.5" />
              Live local CRUD
            </div>
          </section>

          <section
            className="overflow-hidden rounded-lg border border-border bg-white shadow-sm animate-in-smart"
            style={{ animationDelay: "100ms" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-accent/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-4 text-foreground">Company Name</th>
                    <th className="px-6 py-4">Contact PIC</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier.id}
                      className="group animate-in-smart transition-colors hover:bg-accent/10"
                      style={{ animationDelay: `${150 + index * 20}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/5 text-primary border border-primary/10">
                            <Factory className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{supplier.name}</p>
                            <p className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                              {supplier.type} · {supplier.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{supplier.picName}</span>
                        </div>
                      </td>
                      <td className="space-y-1 px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />
                          {supplier.phone}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Mail className="h-2.5 w-2.5" />
                          {supplier.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {supplier.addressLines?.length ? (
                          <div className="max-w-xs space-y-1 text-[10px] text-muted-foreground">
                            {supplier.addressLines.slice(0, 2).map((line, lineIndex) => (
                              <p key={`${supplier.id}-${lineIndex}`} className="truncate">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                            supplier.status === "ACTIVE"
                              ? "bg-success/10 text-success"
                              : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {supplier.status}
                        </span>
                      </td>
                      <td className="relative px-6 py-4 text-center">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === supplier.id ? null : supplier.id)}
                          className="btn-press rounded-md p-1.5 transition-colors hover:bg-accent"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {activeMenuId === supplier.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-6 top-1/2 z-20 min-w-[140px] -translate-y-1/2 rounded-lg border border-border bg-white py-1 shadow-xl animate-in slide-in-from-right-2 duration-150">
                              <button
                                onClick={() => handleEdit(supplier)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit Supplier
                              </button>
                              <button
                                onClick={() => handleDelete(supplier.id)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Supplier
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No suppliers match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-accent/10 px-4 py-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Showing {filteredSuppliers.length} of {suppliers.length} suppliers
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Supplier Directory
              </span>
            </div>
          </section>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
      {children}
    </span>
  );
}

