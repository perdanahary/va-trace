import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { AppUser, UserRole } from "@/lib/userStore";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<AppUser, 'id'> | AppUser) => void;
  user?: AppUser | null;
}

export function UserModal({ isOpen, onClose, onSave, user }: UserModalProps) {
  const [formData, setFormData] = useState<Omit<AppUser, 'id'>>({
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave({ ...formData, id: user.id } as AppUser);
    } else {
      onSave(formData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold">{user ? "Edit Operator" : "Invite New Operator"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. Marco Polo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
            <input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. marco@officebee.co"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-4 py-2 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="analyst">Analyst</option>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })}
                className="w-full px-4 py-2 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company/Affiliation</label>
            <input
              required
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2 border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="e.g. Officebee HQ"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-bold hover:bg-accent transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm font-bold hover:bg-primary/90 transition-all shadow-md btn-press"
            >
              {user ? "Save Changes" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
