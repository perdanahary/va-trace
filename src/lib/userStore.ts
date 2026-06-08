import { useState, useEffect } from 'react';
import type { UserRole } from '@/components/layout/Sidebar';

export type { UserRole } from '@/components/layout/Sidebar';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company: string;
  status: 'Active' | 'Inactive';
}

const STORAGE_KEY = 'va-trace-users';

const initialUsers: AppUser[] = [
  { id: '1', name: "Marco Polo", email: "marco@officebee.co", role: "vendor", company: "CV Cetakan Terbaik", status: "Active" },
  { id: '2', name: "John Brand", email: "john@customer.com", role: "customer", company: "A Mild Variant", status: "Active" },
  { id: '3', name: "Sarah Admin", email: "sarah@officebee.co", role: "admin", company: "Officebee HQ", status: "Active" },
  { id: '4', name: "Dev Vendor", email: "dev@vendor.co", role: "vendor", company: "PT Multi Print", status: "Inactive" },
  { id: '5', name: "Alex Operator", email: "alex@officebee.co", role: "operator", company: "Officebee Operations", status: "Active" },
  { id: '6', name: "Rita Analyst", email: "rita@officebee.co", role: "analyst", company: "Officebee Insights", status: "Active" },
];

export function useUserStore() {
  const [users, setUsers] = useState<AppUser[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialUsers;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

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
