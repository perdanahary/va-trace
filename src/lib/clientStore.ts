import { useEffect, useMemo, useState } from "react";

import type { AppUser } from "@/lib/userStore";

export interface ClientAddress {
  country: "Indonesia";
  city: string;
  province: string;
  address: string;
  postalCode: string;
}

export interface Client {
  id: string;
  name: string;
  entityName: string;
  npwp: string;
  email: string;
  phone: string;
  additionalInfo: string;
  shippingAddress: ClientAddress;
  linkedUserId: string;
}

const CLIENT_STORAGE_KEY = "va-trace-clients";
const USER_STORAGE_KEY = "va-trace-users";
const USERS_UPDATED_EVENT = "va-trace-users-updated";

const initialClients: Client[] = [
  {
    id: "CUS-SAMPOERNA",
    name: "Sampoerna",
    entityName: "PT HM Sampoerna Tbk",
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
    linkedUserId: "2",
  },
];

function readClients(): Client[] {
  if (typeof window === "undefined") {
    return initialClients;
  }

  try {
    const stored = window.localStorage.getItem(CLIENT_STORAGE_KEY);

    if (!stored) {
      return initialClients;
    }

    const parsed = JSON.parse(stored) as Client[];
    return Array.isArray(parsed) ? parsed : initialClients;
  } catch {
    return initialClients;
  }
}

function persistClients(clients: Client[]) {
  window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients));
}

function syncUsersWithClients(clients: Client[]) {
  try {
    const storedUsers = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUsers) return;

    const parsedUsers = JSON.parse(storedUsers) as AppUser[];
    if (!Array.isArray(parsedUsers)) return;

    const syncedUsers = parsedUsers.map((user) => {
      const linkedClient = clients.find((client) => client.linkedUserId === user.id);

      if (!linkedClient || user.role !== "client") {
        return user;
      }

      return {
        ...user,
        company: linkedClient.entityName,
      };
    });

    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(syncedUsers));
    window.dispatchEvent(new CustomEvent(USERS_UPDATED_EVENT));
  } catch {
    // Ignore malformed local storage and keep the client directory usable.
  }
}

function writeClients(clients: Client[]) {
  persistClients(clients);
  syncUsersWithClients(clients);
}

function generateClientId(entityName: string) {
  const prefix = entityName.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 6).toUpperCase() || "CLNT";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getClientSnapshot() {
  return readClients();
}

export function useClientStore() {
  const [clients, setClients] = useState<Client[]>(() => readClients());

  useEffect(() => {
    writeClients(clients);
  }, [clients]);

  const addClient = (client: Omit<Client, "id">) => {
    setClients((prev) => [
      ...prev,
      {
        ...client,
        id: generateClientId(client.entityName),
      },
    ]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id
          ? {
              ...client,
              ...updates,
              shippingAddress: {
                ...client.shippingAddress,
                ...(updates.shippingAddress ?? {}),
              },
            }
          : client,
      ),
    );
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
  };

  return useMemo(
    () => ({
      clients,
      addClient,
      updateClient,
      deleteClient,
    }),
    [clients],
  );
}
