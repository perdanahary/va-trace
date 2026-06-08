import { useEffect, useMemo, useState } from "react";

export interface Supplier {
  id: string;
  name: string;
  type: "PT" | "CV";
  phone: string;
  picName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  addressLines?: string[];
}

const STORAGE_KEY = "va-trace-suppliers";

const initialSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "CV Cetakan Terbaik Sejagat",
    type: "CV",
    phone: "02179697969",
    picName: "Marco Polo",
    email: "marco@officebee.co",
    status: "ACTIVE",
  },
  {
    id: "SUP-004",
    name: "PT. HH Global Services Indonesia",
    type: "PT",
    phone: "+62 21 515 7606",
    picName: "Kiky Natalia",
    email: "Kiky.Natalia@hhglobal.com",
    status: "ACTIVE",
    addressLines: [
      "Gedung Indonesia Stock Exchange Tower 2 Lt.17",
      "Jl. Jendral Sudirman Kav. 52-53",
      "Daerah Khusus Ibu Kota Jakarta 12830",
    ],
  },
  {
    id: "SUP-002",
    name: "PT Print Solusi Indonesia",
    type: "PT",
    phone: "02188997766",
    picName: "Lidya Smith",
    email: "lidya@printsolusi.id",
    status: "ACTIVE",
  },
  {
    id: "SUP-003",
    name: "PT Multi Print Abadi",
    type: "PT",
    phone: "02144553322",
    picName: "Budi Santoso",
    email: "budi@multiprint.co.id",
    status: "INACTIVE",
  },
];

function readSuppliers(): Supplier[] {
  if (typeof window === "undefined") {
    return initialSuppliers;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return initialSuppliers;
    }

    const parsed = JSON.parse(stored) as Supplier[];
    return Array.isArray(parsed) ? parsed : initialSuppliers;
  } catch {
    return initialSuppliers;
  }
}

function generateSupplierId(name: string) {
  const prefix = name.replace(/[^a-zA-Z0-9]+/g, "").slice(0, 4).toUpperCase() || "SUP";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getSupplierSnapshot() {
  return readSuppliers();
}

export function findSupplierByName(name: string) {
  return readSuppliers().find((supplier) => supplier.name === name);
}

export function useSupplierStore() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => readSuppliers());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(suppliers));
  }, [suppliers]);

  const addSupplier = (supplier: Omit<Supplier, "id">) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: generateSupplierId(supplier.name),
    };

    setSuppliers((prev) => [...prev, newSupplier]);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((supplier) => (supplier.id === id ? { ...supplier, ...updates } : supplier)),
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
  };

  return useMemo(
    () => ({
      suppliers,
      addSupplier,
      updateSupplier,
      deleteSupplier,
    }),
    [suppliers],
  );
}

