import { useEffect, useMemo, useState } from "react";
import { Mail, MoreHorizontal, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePics, createPic, updatePic, deletePic } from "@/lib/v2/picStore";
import { useActor } from "@/lib/v2/useActor";
import { buildCommand, toApiError } from "@/lib/v2/workflows";
import type { Pic } from "@/lib/types/v2/pic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PICList() {
  const pics = usePics();
  const actor = useActor("admin", "pic-master");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPic, setEditingPic] = useState<Pic | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredPics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pics;
    return pics.filter((p) =>
      [p.code, p.name, p.email].join(" ").toLowerCase().includes(q),
    );
  }, [pics, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPics.length / pageSize));
  const visiblePics = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPics.slice(start, start + pageSize);
  }, [currentPage, filteredPics]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function openCreate() {
    setEditingPic(null);
    setFormCode("");
    setFormName("");
    setFormEmail("");
    setModalOpen(true);
  }

  function openEdit(pic: Pic) {
    setEditingPic(pic);
    setFormCode(pic.code);
    setFormName(pic.name);
    setFormEmail(pic.email);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPic(null);
  }

  function handleSave() {
    setSaving(true);
    try {
      if (editingPic) {
        const result = updatePic(
          editingPic.id,
          {
            code: formCode,
            name: formName,
            email: formEmail,
            expectedVersion: editingPic.version,
          },
          buildCommand(actor),
        );
        if (result.data) {
          toast.success(`PIC ${result.data.code} updated.`);
        }
      } else {
        const result = createPic(
          { code: formCode, name: formName, email: formEmail },
          buildCommand(actor),
        );
        if (result.data) {
          toast.success(`PIC ${result.data.code} created.`);
        }
      }
      closeModal();
    } catch (error) {
      toast.error(toApiError(error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(picId: string, picCode: string) {
    if (confirm(`Delete PIC "${picCode}"? This cannot be undone.`)) {
      deletePic(picId, buildCommand(actor));
      toast.success(`PIC ${picCode} deleted.`);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />
      <ContentArea>
        <Header title="PIC Management" />

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PICs by code, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add PIC
            </Button>
          </section>

          <Card className="border-border/70 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PIC Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePics.map((pic) => (
                    <TableRow key={pic.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-primary/5 text-primary">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-mono text-sm font-medium">{pic.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{pic.name}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {pic.email || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(pic.audit.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(pic)}>
                              Edit PIC
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(pic.id, pic.code)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete PIC
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visiblePics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        {searchQuery ? "No PICs match your search." : "No PICs yet. Click \"Add PIC\" to create one."}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredPics.length)} of {filteredPics.length} rows
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((v) => Math.max(1, v - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((v) => Math.min(totalPages, v + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </main>
      </ContentArea>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPic ? "Edit PIC" : "Add PIC"}</DialogTitle>
            <DialogDescription>
              {editingPic
                ? "Update the PIC master data record."
                : "Create a new Person-In-Charge master data record."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pic-code">PIC Code *</Label>
              <Input
                id="pic-code"
                placeholder="e.g. PIC001"
                maxLength={10}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
              <p className="text-[11px] text-muted-foreground">Alphanumeric, max 10 characters.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pic-name">Name *</Label>
              <Input
                id="pic-name"
                placeholder="e.g. John Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pic-email">Email *</Label>
              <Input
                id="pic-email"
                type="email"
                placeholder="e.g. john@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formCode.trim() || !formName.trim()}
            >
              {saving ? "Saving..." : editingPic ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
