import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Client } from "@/lib/clientStore";
import { useUserStore } from "@/lib/userStore";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, "id"> | Client) => void;
  client?: Client | null;
}

type ClientFormData = Omit<Client, "id">;

const emptyForm: ClientFormData = {
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

export function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const { users } = useUserStore();
  const clientUsers = useMemo(() => users.filter((user) => user.role === "client"), [users]);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        entityName: client.entityName,
        npwp: client.npwp,
        email: client.email,
        phone: client.phone,
        additionalInfo: client.additionalInfo,
        shippingAddress: client.shippingAddress,
        linkedUserId: client.linkedUserId,
      });
      return;
    }

    setFormData({
      ...emptyForm,
      linkedUserId: clientUsers[0]?.id ?? "",
    });
  }, [client, clientUsers, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (client) {
      onSave({ ...formData, id: client.id });
    } else {
      onSave(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add Client"}</DialogTitle>
          <DialogDescription>Maintain the client master data and bind it to the existing client user account.</DialogDescription>
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
                  <SelectValue placeholder="Select client user" />
                </SelectTrigger>
                <SelectContent>
                  {clientUsers.map((user) => (
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
            <Button type="submit">{client ? "Save Changes" : "Create Client"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
