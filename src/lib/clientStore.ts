import { useMemo, useSyncExternalStore } from "react";

import type { AppUser } from "@/lib/userStore";

export interface ClientAddress {
  country: "Indonesia";
  city: string;
  province: string;
  subDistrict: string;
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
      subDistrict: "",
      address: "",
      postalCode: "",
    },
    linkedUserId: "2",
  },
];

const SCHEMA_VERSION = 1;
const CLIENTS_CHANGE_EVENT = "va-trace-clients:change";

let clients: Client[] = initClients();

function initClients(): Client[] {
  if (typeof window === "undefined") {
    return initialClients;
  }

  try {
    const stored = window.localStorage.getItem(CLIENT_STORAGE_KEY);
    if (!stored) {
      return initialClients;
    }

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
      return parsed.data as Client[];
    }
    return initialClients;
  } catch {
    return initialClients;
  }
}

function getClients(): Client[] {
  return clients;
}

function setClientsAndPersist(nextClients: Client[]) {
  clients = nextClients;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        CLIENT_STORAGE_KEY,
        JSON.stringify({
          version: SCHEMA_VERSION,
          data: clients,
        })
      );
    } catch (error) {
      console.warn("localStorage write failed:", error);
    }
    syncUsersWithClients(clients);
    window.dispatchEvent(new Event(CLIENTS_CHANGE_EVENT));
  }
}

function syncUsersWithClients(clientsList: Client[]) {
  try {
    const storedUsers = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUsers) return;

    const parsed = JSON.parse(storedUsers);
    let userArray: AppUser[] = [];
    let isVersioned = false;

    if (parsed && typeof parsed === "object" && parsed.version === 1 && Array.isArray(parsed.data)) {
      userArray = parsed.data as AppUser[];
      isVersioned = true;
    } else if (Array.isArray(parsed)) {
      userArray = parsed as AppUser[];
    } else {
      return;
    }

    const syncedUsers = userArray.map((user) => {
      const linkedClient = clientsList.find((client) => client.linkedUserId === user.id);

      if (!linkedClient || user.role !== "client") {
        return user;
      }

      return {
        ...user,
        company: linkedClient.entityName,
      };
    });

    const payload = isVersioned ? { version: 1, data: syncedUsers } : syncedUsers;
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(USERS_UPDATED_EVENT));
  } catch {
    // Ignore malformed local storage
  }
}

function subscribe(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStoreEvent = () => listener();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CLIENT_STORAGE_KEY) {
      try {
        const stored = event.newValue;
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && parsed.version === SCHEMA_VERSION && Array.isArray(parsed.data)) {
            clients = parsed.data as Client[];
          }
        } else {
          clients = initialClients;
        }
        listener();
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener(CLIENTS_CHANGE_EVENT, handleStoreEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CLIENTS_CHANGE_EVENT, handleStoreEvent);
    window.removeEventListener("storage", handleStorage);
  };
}

function generateClientId(entityName: string) {
  const prefix = entityName.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 6).toUpperCase() || "CLNT";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getClientSnapshot() {
  return getClients();
}

export function useClientStore() {
  const currentClients = useSyncExternalStore(subscribe, getClients, () => initialClients);

  const addClient = (client: Omit<Client, "id">) => {
    setClientsAndPersist([
      ...getClients(),
      {
        ...client,
        id: generateClientId(client.entityName),
      },
    ]);
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClientsAndPersist(
      getClients().map((client) =>
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
      )
    );
  };

  const deleteClient = (id: string) => {
    setClientsAndPersist(getClients().filter((client) => client.id !== id));
  };

  return useMemo(
    () => ({
      clients: currentClients,
      addClient,
      updateClient,
      deleteClient,
    }),
    [currentClients],
  );
}
