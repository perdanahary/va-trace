import { useEffect, useState } from "react";

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
  supplier?: Supplier | null;
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

export function SupplierModal({ isOpen, onClose, onSave, supplier }: SupplierModalProps) {
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
  }, [isOpen, supplier]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "Register New Supplier"}</DialogTitle>
          <DialogDescription>Keep company, contact, and address details ready for order assignment.</DialogDescription>
        </DialogHeader>

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
            <Button type="submit">{supplier ? "Save Changes" : "Create Supplier"}</Button>
          </DialogFooter>
        </form>
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
