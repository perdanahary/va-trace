import { useState } from "react";
import { Edit2, Eye, MoreHorizontal, Plus, Search, Shield, Trash2, User as UserIcon } from "lucide-react";

import { Sidebar, type UserRole } from "@/components/layout/Sidebar";
import { ContentArea } from "@/components/layout/ContentArea";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useUserStore, type AppUser } from "@/lib/userStore";
import { UserModal } from "./UserModal";

interface UserListProps {
  role?: Extract<UserRole, "admin" | "analyst">;
}

export function UserList({ role = "admin" }: UserListProps) {
  const { users, addUser, updateUser, deleteUser } = useUserStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const canManageUsers = role === "admin";

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSave = (userData: Omit<AppUser, "id"> | AppUser) => {
    if ("id" in userData) {
      updateUser(userData.id, userData);
    } else {
      addUser(userData);
    }

    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUser(id);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <ContentArea>
        <Header title={canManageUsers ? "User Management" : "User Directory"} />

        <main className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or company..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            {canManageUsers ? (
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Invite New User
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.24em]">
                <Eye className="mr-2 h-3.5 w-3.5" />
                Read Only Access
              </Badge>
            )}
          </section>

          {!canManageUsers ? (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Analysts can search and review user accounts, but only admins can invite, edit, or remove users.
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/70 shadow-sm p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name & Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company/Affiliation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Shield
                            className={cn(
                              "h-3.5 w-3.5",
                              user.role === "admin"
                                ? "text-primary"
                                : user.role === "analyst"
                                  ? "text-blue-500"
                                  : user.role === "operator"
                                    ? "text-success"
                                    : "text-muted-foreground",
                            )}
                          />
                          <span className="text-sm capitalize">{user.role}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.company}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageUsers ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">View</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        No users found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </ContentArea>

      {canManageUsers ? (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSave}
          user={selectedUser}
        />
      ) : null}
    </div>
  );
}
