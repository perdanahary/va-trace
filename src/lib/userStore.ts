import { useSyncExternalStore } from 'react';
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
  { id: '7', name: "HH Global Vendor", email: "vendor@hhglobal.com", role: "vendor", company: "PT. HH Global Services Indonesia", status: "Active", supplierId: "SUP-004" },
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

const SCHEMA_VERSION = 1;
const USERS_CHANGE_EVENT = "va-trace-users:change";

let users: AppUser[] = initUsers();

function initUsers(): AppUser[] {
  const seeds = applyClientAffiliations(initialUsers);
  if (typeof window === "undefined") {
    return seeds;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return seeds;
    }

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
      return applyClientAffiliations(parsed.data as AppUser[]);
    }
    return seeds;
  } catch {
    return seeds;
  }
}

function getUsers(): AppUser[] {
  return users;
}

function setUsersAndPersist(nextUsers: AppUser[]) {
  users = nextUsers;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: SCHEMA_VERSION,
          data: users,
        })
      );
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
    window.dispatchEvent(new Event(USERS_CHANGE_EVENT));
  }
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStoreEvent = () => listener();

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      try {
        const stored = event.newValue;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
            users = applyClientAffiliations(parsed.data as AppUser[]);
          }
        } else {
          users = applyClientAffiliations(initialUsers);
        }
        listener();
      } catch {
        // ignore
      }
    }
  };

  const handleUsersUpdated = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
          users = applyClientAffiliations(parsed.data as AppUser[]);
        } else if (Array.isArray(parsed)) {
          users = applyClientAffiliations(parsed as AppUser[]);
        }
      }
    } catch {
      // ignore
    }
    listener();
  };

  window.addEventListener(USERS_CHANGE_EVENT, handleStoreEvent);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(USERS_UPDATED_EVENT, handleUsersUpdated);

  return () => {
    window.removeEventListener(USERS_CHANGE_EVENT, handleStoreEvent);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(USERS_UPDATED_EVENT, handleUsersUpdated);
  };
}

export function useUserStore() {
  const currentUsers = useSyncExternalStore(subscribe, getUsers, () => applyClientAffiliations(initialUsers));

  const addUser = (user: Omit<AppUser, 'id'>) => {
    const newUser = { ...user, id: Math.random().toString(36).substr(2, 9) };
    setUsersAndPersist([...getUsers(), newUser]);
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsersAndPersist(getUsers().map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = (id: string) => {
    setUsersAndPersist(getUsers().filter(u => u.id !== id));
  };

  return { users: currentUsers, addUser, updateUser, deleteUser };
}
