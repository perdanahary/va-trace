import { useEffect, useState } from "react";
import { Building2, Mail, MapPin, Phone, User } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Supplier } from "@/lib/supplierStore";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, "id"> | Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  supplier?: Supplier | null;
  mode?: "create" | "edit" | "view";
}

const emptySupplier: Omit<Supplier, "id"> = {
  name: "",
  type: "PT",
  phone: "",
  picName: "",
  email: "",
  status: "ACTIVE",
  addressLines: [],
};

export function SupplierModal({ isOpen, onClose, onSave, onEdit, supplier, mode }: SupplierModalProps) {
  const resolvedMode = mode ?? (supplier ? "edit" : "create");
  const isViewMode = resolvedMode === "view";
  const isCreateMode = resolvedMode === "create";
  const [formData, setFormData] = useState<Omit<Supplier, "id">>(emptySupplier);
  const [addressText, setAddressText] = useState("");

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        type: supplier.type,
        phone: supplier.phone,
        picName: supplier.picName,
        email: supplier.email,
        status: supplier.status,
        addressLines: supplier.addressLines ?? [],
      });
      setAddressText((supplier.addressLines ?? []).join("\n"));
      return;
    }

    setFormData(emptySupplier);
    setAddressText("");
  }, [isOpen, supplier, resolvedMode]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isViewMode) {
      return;
    }

    const addressLines = addressText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      ...formData,
      addressLines: addressLines.length ? addressLines : undefined,
    };

    if (supplier) {
      onSave({ ...payload, id: supplier.id });
    } else {
      onSave(payload);
    }

    onClose();
  };

  const title = isViewMode ? "Supplier Detail" : supplier ? "Edit Supplier" : "Register New Supplier";
  const description = isViewMode
    ? "Review supplier master data before assigning them to orders."
    : "Keep company, contact, and address details ready for order assignment.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {isViewMode && supplier ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Company Name" icon={Building2} value={supplier.name} />
                <ReadOnlyField label="Business Type" value={supplier.type} />
                <ReadOnlyField label="Supplier ID" value={supplier.id} />
                <ReadOnlyField label="Status" value={<StatusBadge status={supplier.status === "ACTIVE" ? "Active" : "Inactive"} />} />
                <ReadOnlyField label="PIC Name" icon={User} value={supplier.picName} />
                <ReadOnlyField label="Phone Number" icon={Phone} value={supplier.phone} />
                <ReadOnlyField label="Email Address" icon={Mail} value={supplier.email} />
                <ReadOnlyField
                  label="Address Lines"
                  icon={MapPin}
                  className="md:col-span-2"
                  value={
                    supplier.addressLines?.length ? (
                      <div className="space-y-1">
                        {supplier.addressLines.map((line, index) => (
                          <p key={`${supplier.id}-address-${index}`}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company Name" required>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. PT Print Solusi Indonesia"
                  />
                </Field>

                <Field label="Business Type" required>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as Supplier["type"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PT">PT</SelectItem>
                      <SelectItem value="CV">CV</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="PIC Name" required>
                  <Input
                    required
                    value={formData.picName}
                    onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                    placeholder="e.g. Marco Polo"
                  />
                </Field>

                <Field label="Contact Email" required>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. pic@supplier.co.id"
                  />
                </Field>

                <Field label="Phone Number" required>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 02188997766"
                  />
                </Field>

                <Field label="Status" required>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as Supplier["status"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Address Lines">
                <Textarea
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder={"One line per row\nStreet address\nCity / postal code"}
                  className="min-h-28"
                />
                <p className="text-xs text-muted-foreground">Optional. Use one line per row for delivery-note formatting.</p>
              </Field>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">{isCreateMode ? "Create Supplier" : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          )}
        </div>

        {isViewMode && supplier ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                onClose();
                onEdit?.(supplier);
              }}
            >
              Edit Supplier
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required ? "*" : ""}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <div className="mt-3 flex items-start gap-2 text-sm">
          {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : null}
          <div className="min-w-0 flex-1 font-medium text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}
