import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Customer } from "@/lib/customerStore";
import { useUserStore } from "@/lib/userStore";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, "id"> | Customer) => void;
  customer?: Customer | null;
}

type CustomerFormData = Omit<Customer, "id">;

const emptyForm: CustomerFormData = {
  name: "",
  entityName: "",
  npwp: "",
  email: "",
  phone: "",
  additionalInfo: "",
  shippingAddress: {
    country: "Indonesia",
    city: "",
    province: "",
    address: "",
    postalCode: "",
  },
  linkedUserId: "",
};

export function CustomerModal({ isOpen, onClose, onSave, customer }: CustomerModalProps) {
  const { users } = useUserStore();
  const customerUsers = useMemo(() => users.filter((user) => user.role === "customer"), [users]);
  const [formData, setFormData] = useState<CustomerFormData>(emptyForm);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        entityName: customer.entityName,
        npwp: customer.npwp,
        email: customer.email,
        phone: customer.phone,
        additionalInfo: customer.additionalInfo,
        shippingAddress: customer.shippingAddress,
        linkedUserId: customer.linkedUserId,
      });
      return;
    }

    setFormData({
      ...emptyForm,
      linkedUserId: customerUsers[0]?.id ?? "",
    });
  }, [customer, customerUsers, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (customer) {
      onSave({ ...formData, id: customer.id });
    } else {
      onSave(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>Maintain the customer master data and bind it to the existing customer user account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                required
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Sampoerna"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Company / Entity</label>
              <Input
                required
                value={formData.entityName}
                onChange={(event) => setFormData((current) => ({ ...current, entityName: event.target.value }))}
                placeholder="e.g. PT HM Sampoerna Tbk"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NPWP (Business Number)</label>
              <Input
                value={formData.npwp}
                onChange={(event) => setFormData((current) => ({ ...current, npwp: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bound User</label>
              <Select value={formData.linkedUserId} onValueChange={(value) => setFormData((current) => ({ ...current, linkedUserId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer user" />
                </SelectTrigger>
                <SelectContent>
                  {customerUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Information (Public)</label>
            <Textarea
              value={formData.additionalInfo}
              onChange={(event) => setFormData((current) => ({ ...current, additionalInfo: event.target.value }))}
              placeholder="Optional"
              rows={3}
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border/70 p-4">
            <div>
              <h3 className="text-sm font-semibold">Shipping Address</h3>
              <p className="text-xs text-muted-foreground">Country is fixed to Indonesia for now.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Select
                  value={formData.shippingAddress.country}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      shippingAddress: { ...current.shippingAddress, country: value as "Indonesia" },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indonesia">Indonesia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Province</label>
                <Input
                  value={formData.shippingAddress.province}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      shippingAddress: { ...current.shippingAddress, province: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <Input
                  value={formData.shippingAddress.city}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      shippingAddress: { ...current.shippingAddress, city: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Postal Code</label>
                <Input
                  value={formData.shippingAddress.postalCode}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      shippingAddress: { ...current.shippingAddress, postalCode: event.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <Textarea
                value={formData.shippingAddress.address}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    shippingAddress: { ...current.shippingAddress, address: event.target.value },
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{customer ? "Save Changes" : "Create Customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
