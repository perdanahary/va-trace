import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SalesPointMapping } from "@/lib/types";

interface SalesPointEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wcode: string, data: Partial<SalesPointMapping>) => void;
  mapping: SalesPointMapping | null;
}

function emptyPic() {
  return { name: "", email: "", phone: "" };
}

function emptyAddress() {
  return { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };
}

export function SalesPointEditModal({ isOpen, onClose, onSave, mapping }: SalesPointEditModalProps) {
  const [pic1, setPic1] = useState(emptyPic);
  const [pic2, setPic2] = useState(emptyPic);
  const [remarks, setRemarks] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [deliveryCompany, setDeliveryCompany] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryPic, setDeliveryPic] = useState("");

  useEffect(() => {
    if (mapping) {
      setPic1({ ...emptyPic(), ...mapping.pic1 });
      setPic2({ ...emptyPic(), ...mapping.pic2 });
      setRemarks(mapping.remarks || "");
      setNote(mapping.note || "");
      setAddress({ ...emptyAddress(), ...mapping.shippingAddress });
      setDeliveryCompany(mapping.deliveryCompanyName || "");
      setDeliveryLocation(mapping.deliveryLocationName || "");
      setDeliveryAddress(mapping.address || "");
      setDeliveryPhone(mapping.phone || "");
      setDeliveryPic(mapping.picClient || "");
    }
  }, [mapping, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapping) return;
    onSave(mapping.wcode, {
      pic1,
      pic2,
      remarks,
      note,
      shippingAddress: address,
      deliveryCompanyName: deliveryCompany || undefined,
      deliveryLocationName: deliveryLocation || undefined,
      address: deliveryAddress || undefined,
      phone: deliveryPhone || undefined,
      picClient: deliveryPic || undefined,
    });
  };

  const updatePic1 = (field: keyof typeof pic1, value: string) => setPic1((prev) => ({ ...prev, [field]: value }));
  const updatePic2 = (field: keyof typeof pic2, value: string) => setPic2((prev) => ({ ...prev, [field]: value }));
  const updateAddress = (field: keyof typeof address, value: string) => setAddress((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Mapping — {mapping?.salesPoint}</DialogTitle>
          <DialogDescription>
            {mapping?.zone} &middot; {mapping?.region} &middot; {mapping?.area} &middot; {mapping?.subArea} &middot;{" "}
            <span className="font-mono">{mapping?.wcode}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-border/70 p-4 space-y-4">
            <h3 className="text-sm font-semibold">PIC 1</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={pic1.name} onChange={(e) => updatePic1("name", e.target.value)} placeholder="PIC 1 name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={pic1.email} onChange={(e) => updatePic1("email", e.target.value)} placeholder="email@domain.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input value={pic1.phone} onChange={(e) => updatePic1("phone", e.target.value)} placeholder="Phone number" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 space-y-4">
            <h3 className="text-sm font-semibold">PIC 2</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input value={pic2.name} onChange={(e) => updatePic2("name", e.target.value)} placeholder="PIC 2 name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={pic2.email} onChange={(e) => updatePic2("email", e.target.value)} placeholder="email@domain.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input value={pic2.phone} onChange={(e) => updatePic2("phone", e.target.value)} placeholder="Phone number" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Remarks</label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. PIC 1: ARA; PIC 2: Team Logistic" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Note</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 space-y-4">
            <h3 className="text-sm font-semibold">Shipping Address (from seed)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Provinsi</label>
                <Input value={address.provinsi} onChange={(e) => updateAddress("provinsi", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kota / Kabupaten</label>
                <Input value={address.kotaKabupaten} onChange={(e) => updateAddress("kotaKabupaten", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kecamatan</label>
                <Input value={address.kecamatan} onChange={(e) => updateAddress("kecamatan", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Kode Pos</label>
                <Input value={address.kodePos} onChange={(e) => updateAddress("kodePos", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alamat</label>
              <Textarea value={address.alamat} onChange={(e) => updateAddress("alamat", e.target.value)} rows={3} />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4 space-y-4">
            <h3 className="text-sm font-semibold">Delivery Info (override)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Company Name</label>
                <Input value={deliveryCompany} onChange={(e) => setDeliveryCompany(e.target.value)} placeholder="Delivery company" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Location Name</label>
                <Input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Delivery location" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="Delivery phone" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">PIC Client</label>
                <Input value={deliveryPic} onChange={(e) => setDeliveryPic(e.target.value)} placeholder="Client PIC name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Delivery Address</label>
              <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
