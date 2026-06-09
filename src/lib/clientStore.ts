import { useEffect, useMemo, useState } from "react";

import type { AppUser } from "@/lib/userStore";

export interface CustomerAddress {
  country: "Indonesia";
  city: string;
  province: string;
  address: string;
  postalCode: string;
}

export interface Customer {
  id: string;
  name: string;
  entityName: string;
  npwp: string;
  email: string;
  phone: string;
  additionalInfo: string;
  shippingAddress: CustomerAddress;
  linkedUserId: string;
}

const CUSTOMER_STORAGE_KEY = "va-trace-customers";
const USER_STORAGE_KEY = "va-trace-users";
const USERS_UPDATED_EVENT = "va-trace-users-updated";

const initialCustomers: Customer[] = [
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

function readCustomers(): Customer[] {
  if (typeof window === "undefined") {
    return initialCustomers;
  }

  try {
    const stored = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);

    if (!stored) {
      return initialCustomers;
    }

    const parsed = JSON.parse(stored) as Customer[];
    return Array.isArray(parsed) ? parsed : initialCustomers;
  } catch {
    return initialCustomers;
  }
}

function persistCustomers(customers: Customer[]) {
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
}

function syncUsersWithCustomers(customers: Customer[]) {
  try {
    const storedUsers = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!storedUsers) return;

    const parsedUsers = JSON.parse(storedUsers) as AppUser[];
    if (!Array.isArray(parsedUsers)) return;

    const syncedUsers = parsedUsers.map((user) => {
      const linkedCustomer = customers.find((customer) => customer.linkedUserId === user.id);

      if (!linkedCustomer || user.role !== "customer") {
        return user;
      }

      return {
        ...user,
        company: linkedCustomer.entityName,
      };
    });

    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(syncedUsers));
    window.dispatchEvent(new CustomEvent(USERS_UPDATED_EVENT));
  } catch {
    // Ignore malformed local storage and keep the customer directory usable.
  }
}

function writeCustomers(customers: Customer[]) {
  persistCustomers(customers);
  syncUsersWithCustomers(customers);
}

function generateCustomerId(entityName: string) {
  const prefix = entityName.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 6).toUpperCase() || "CUST";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getCustomerSnapshot() {
  return readCustomers();
}

export function useCustomerStore() {
  const [customers, setCustomers] = useState<Customer[]>(() => readCustomers());

  useEffect(() => {
    writeCustomers(customers);
  }, [customers]);

  const addCustomer = (customer: Omit<Customer, "id">) => {
    setCustomers((prev) => [
      ...prev,
      {
        ...customer,
        id: generateCustomerId(customer.entityName),
      },
    ]);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === id
          ? {
              ...customer,
              ...updates,
              shippingAddress: {
                ...customer.shippingAddress,
                ...(updates.shippingAddress ?? {}),
              },
            }
          : customer,
      ),
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
  };

  return useMemo(
    () => ({
      customers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
    }),
    [customers],
  );
}
