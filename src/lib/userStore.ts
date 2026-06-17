import { useState, useEffect } from 'react';
import type { UserRole } from '@/components/layout/Sidebar';
import { getClientSnapshot } from "@/lib/clientStore";

export type { UserRole } from '@/components/layout/Sidebar';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  status: 'Active' | 'Inactive';
  /** Links a vendor user to their supplier record for scoped API commands. */
  supplierId?: string;
}

const STORAGE_KEY = 'va-trace-users';
const USERS_UPDATED_EVENT = "va-trace-users-updated";

const initialUsers: AppUser[] = [
  { id: '1', name: "Marco Polo", email: "marco@officebee.co", role: "vendor", company: "CV Cetakan Terbaik", status: "Active", supplierId: "SUP-002" },
  { id: '2', name: "John Brand", email: "john@client.com", role: "client", company: "PT HM Sampoerna Tbk", status: "Active" },
  { id: '3', name: "Sarah Admin", email: "sarah@officebee.co", role: "admin", company: "Officebee HQ", status: "Active" },
  { id: '4', name: "Dev Vendor", email: "dev@vendor.co", role: "vendor", company: "PT Multi Print", status: "Inactive" },
  { id: '5', name: "Alex Operator", email: "alex@officebee.co", role: "operator", company: "Officebee Operations", status: "Active" },
  { id: '6', name: "Rita Analyst", email: "rita@officebee.co", role: "analyst", company: "Officebee Insights", status: "Active" },
];

function applyClientAffiliations(users: AppUser[]) {
  const clients = getClientSnapshot();

  return users.map((user) => {
    const linkedClient = clients.find((client) => client.linkedUserId === user.id);

    if (!linkedClient || user.role !== "client") {
      return user;
    }

    return {
      ...user,
      company: linkedClient.entityName,
    };
  });
}

function readUsers(): AppUser[] {
  if (typeof window === "undefined") {
    return initialUsers;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return applyClientAffiliations(initialUsers);
    }

    const parsed = JSON.parse(stored) as AppUser[];
    return Array.isArray(parsed) ? applyClientAffiliations(parsed) : applyClientAffiliations(initialUsers);
  } catch {
    return applyClientAffiliations(initialUsers);
  }
}

export function useUserStore() {
  const [users, setUsers] = useState<AppUser[]>(() => readUsers());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    const syncUsers = () => {
      setUsers(readUsers());
    };

    window.addEventListener("storage", syncUsers);
    window.addEventListener(USERS_UPDATED_EVENT, syncUsers as EventListener);

    return () => {
      window.removeEventListener("storage", syncUsers);
      window.removeEventListener(USERS_UPDATED_EVENT, syncUsers as EventListener);
    };
  }, []);

  const addUser = (user: Omit<AppUser, 'id'>) => {
    const newUser = { ...user, id: Math.random().toString(36).substr(2, 9) };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return { users, addUser, updateUser, deleteUser };
}
