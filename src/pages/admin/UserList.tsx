import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { UserRole } from "@/components/layout/Sidebar";
import { Search, Plus, MoreVertical, Shield, User as UserIcon, Edit2, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore, AppUser } from "@/lib/userStore";
import { useState } from "react";
import { UserModal } from "./UserModal";

interface UserListProps {
  role?: Extract<UserRole, "admin" | "analyst">;
}

export function UserList({ role = "admin" }: UserListProps) {
  const { users, addUser, updateUser, deleteUser } = useUserStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const canManageUsers = role === "admin";

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = (userData: Omit<AppUser, 'id'> | AppUser) => {
    if ('id' in userData) {
      updateUser(userData.id, userData);
    } else {
      addUser(userData);
    }
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this operator?")) {
      deleteUser(id);
    }
    setActiveMenuId(null);
  };

  return (
    <div className="flex min-h-screen bg-canvas-white">
      <Sidebar role={role} />
      <div className="flex-1">
        <Header title={canManageUsers ? "Operator Management" : "Operator Directory"} />
        
        <main className="p-8 space-y-6">
          <section className="flex items-center justify-between animate-in-smart">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search operators by name, email, or company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-md text-sm focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm"
              />
            </div>
            {canManageUsers ? (
              <button 
                onClick={() => {
                  setSelectedUser(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-xs font-bold hover:bg-primary/90 transition-all btn-press shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Invite New Operator
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                <Eye className="h-3.5 w-3.5" />
                Read Only Access
              </div>
            )}
          </section>

          {!canManageUsers && (
            <section className="rounded-lg border border-border bg-white p-4 text-xs text-muted-foreground shadow-sm animate-in-smart">
                Analysts can search and review operator accounts, but only admins can invite, edit, or remove operators.
            </section>
          )}

          <section className="bg-white rounded-lg border border-border overflow-hidden shadow-sm animate-in-smart" style={{ animationDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border">
                    <th className="px-6 py-4">Name & Contact</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Company/Affiliation</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-accent/10 transition-colors group animate-in-smart"
                      style={{ animationDelay: `${150 + (index * 20)}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-none">{user.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Shield className={cn(
                            "w-3 h-3", 
                            user.role === 'admin' ? 'text-primary' : 
                            user.role === 'analyst' ? 'text-blue-500' :
                            user.role === 'operator' ? 'text-success' :
                            'text-muted-foreground'
                          )} />
                          <span className="text-xs font-medium capitalize">{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        {user.company}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                          user.status === 'Active' ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-400'
                        )}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center relative">
                        {canManageUsers ? (
                          <>
                            <button 
                              onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                              className="p-1.5 hover:bg-accent rounded-md transition-colors btn-press"
                            >
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>

                            {activeMenuId === user.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-white border border-border rounded-lg shadow-xl z-20 py-1 min-w-[120px] animate-in slide-in-from-right-2 duration-150">
                                  <button 
                                    onClick={() => handleEdit(user)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Edit Operator
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(user.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Operator
                                  </button>
                                </div>
                              </>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            View
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                        No operators found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {canManageUsers && (
          <UserModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }} 
          onSave={handleSave}
          user={selectedUser}
        />
      )}
    </div>
  );
}
