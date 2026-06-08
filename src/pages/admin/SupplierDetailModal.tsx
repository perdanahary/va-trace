import { Building2, Mail, MapPin, Phone, User } from "lucide-react";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Supplier } from "@/lib/supplierStore";

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (supplier: Supplier) => void;
  supplier: Supplier | null;
}

export function SupplierDetailModal({ isOpen, onClose, onEdit, supplier }: SupplierDetailModalProps) {
  if (!supplier) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Supplier Detail</DialogTitle>
          <DialogDescription>Review supplier master data before assigning them to orders.</DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onEdit(supplier);
            }}
          >
            Edit Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
