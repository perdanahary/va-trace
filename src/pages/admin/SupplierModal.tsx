import { useEffect, useState } from "react";
import { X } from "lucide-react";
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-bold">{supplier ? "Edit Supplier" : "Register New Supplier"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep company, contact, and address details ready for order assignment.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-accent" aria-label="Close supplier form">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Company Name" htmlFor="supplier-name" required>
              <input
                id="supplier-name"
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-md border border-border px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                placeholder="e.g. PT Print Solusi Indonesia"
              />
            </Field>

            <Field label="Business Type" htmlFor="supplier-type" required>
              <select
                id="supplier-type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Supplier["type"] })}
                className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
              >
                <option value="PT">PT</option>
                <option value="CV">CV</option>
              </select>
            </Field>

            <Field label="PIC Name" htmlFor="supplier-pic" required>
              <input
                id="supplier-pic"
                required
                type="text"
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                className="w-full rounded-md border border-border px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                placeholder="e.g. Marco Polo"
              />
            </Field>

            <Field label="Contact Email" htmlFor="supplier-email" required>
              <input
                id="supplier-email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-md border border-border px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                placeholder="e.g. pic@supplier.co.id"
              />
            </Field>

            <Field label="Phone Number" htmlFor="supplier-phone" required>
              <input
                id="supplier-phone"
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-md border border-border px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
                placeholder="e.g. 02188997766"
              />
            </Field>

            <Field label="Status" htmlFor="supplier-status" required>
              <select
                id="supplier-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Supplier["status"] })}
                className="w-full rounded-md border border-border bg-white px-4 py-2 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </Field>
          </div>

          <Field label="Address Lines" htmlFor="supplier-address-lines">
            <textarea
              id="supplier-address-lines"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              className="min-h-28 w-full rounded-md border border-border px-4 py-3 text-sm outline-none transition-all focus:ring-1 focus:ring-primary"
              placeholder={"One line per row\nStreet address\nCity / postal code"}
            />
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Optional. Use one line per row for delivery-note formatting.
            </p>
          </Field>

          <div className="flex gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-bold transition-all hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-primary/90 btn-press"
            >
              {supplier ? "Save Changes" : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label} {required ? "*" : ""}
      </label>
      {children}
    </div>
  );
}
