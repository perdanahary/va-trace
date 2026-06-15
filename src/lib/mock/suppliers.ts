import type { Supplier } from "@/lib/types/supplier";

export const mockSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "CV Cetakan Terbaik Sejagat",
    type: "CV",
    phone: "02179697969",
    picName: "Marco Polo",
    email: "marco@officebee.co",
    status: "INACTIVE",
    vendorPICs: [{ name: "Marco Polo", phone: "02179697969", email: "marco@officebee.co" }],
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
    vendorPICs: [{ name: "Kiky Natalia", phone: "+62 21 515 7606", email: "Kiky.Natalia@hhglobal.com" }],
  },
  {
    id: "SUP-002",
    name: "PT Print Solusi Indonesia",
    type: "PT",
    phone: "02188997766",
    picName: "Lidya Smith",
    email: "lidya@printsolusi.id",
    status: "INACTIVE",
    vendorPICs: [{ name: "Lidya Smith", phone: "02188997766", email: "lidya@printsolusi.id" }],
  },
  {
    id: "SUP-003",
    name: "PT Multi Print Abadi",
    type: "PT",
    phone: "02144553322",
    picName: "Budi Santoso",
    email: "budi@multiprint.co.id",
    status: "INACTIVE",
    vendorPICs: [{ name: "Budi Santoso", phone: "02144553322", email: "budi@multiprint.co.id" }],
  }
];

