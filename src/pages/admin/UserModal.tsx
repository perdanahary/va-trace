import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppUser, UserRole } from "@/lib/userStore";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<AppUser, "id"> | AppUser) => void;
  user?: AppUser | null;
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [formData, setFormData] = useState<Omit<AppUser, "id">>({
    name: "",
    email: "",
    role: "operator",
    company: "",
    status: "Active",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        status: user.status,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "operator",
        company: "",
        status: "Active",
      });
    }
  }, [user, isOpen]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (user) {
      onSave({ ...formData, id: user.id } as AppUser);
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? "Edit User" : "Invite New User"}</DialogTitle>
          <DialogDescription>Capture the user profile and their access level.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Marco Polo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. marco@officebee.co"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Company/Affiliation</label>
            <Input
              required
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g. Officebee HQ"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{user ? "Save Changes" : "Send Invitation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
