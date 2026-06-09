const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "documents", "master-pic-address_sales-point.csv");
const csv = fs.readFileSync(csvPath, "utf-8");
const lines = csv.split("\n").filter(Boolean);

// Parse CSV (semicolon separated, with possible quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const header = parseCSVLine(lines[0]);
// Index: Zone(0), Region(1), Area(2), SubArea(3), PIC1(4), Email1(5), Phone1(6), PIC2(7), Email2(8), Phone2(9), Remarks(10), AlamatPengiriman(11), Note(12)

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  if (cols.length < 13) continue;
  const alamat = cols[11].replace(/\n/g, ", ").replace(/\s+/g, " ").trim();
  rows.push({
    zone: cols[0],
    region: cols[1],
    area: cols[2],
    subArea: cols[3],
    pic1Name: cols[4],
    pic1Email: cols[5],
    pic1Phone: cols[6],
    pic2Name: cols[7],
    pic2Email: cols[8],
    pic2Phone: cols[9],
    remarks: cols[10],
    alamatPengiriman: alamat,
    note: cols[12],
  });
}

// Best-effort address parser
function parseAddress(raw) {
  if (!raw) return { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };

  // Extract kode pos (5 digits or 5 digits followed by non-digit)
  let kodePos = "";
  const kpMatch = raw.match(/\b(\d{5})\b/);
  if (kpMatch) kodePos = kpMatch[1];

  let provinsi = "";
  // Known provinces list
  const provinces = [
    "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau",
    "Jambi", "Bengkulu", "Sumatera Selatan", "Bangka Belitung", "Lampung",
    "Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "Jawa Timur",
    "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
    "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara",
    "Sulawesi Utara", "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Sulawesi Barat", "Gorontalo",
    "Maluku", "Maluku Utara",
    "Papua", "Papua Barat", "Papua Selatan", "Papua Tengah", "Papua Pegunungan"
  ];

  for (const prov of provinces) {
    if (raw.includes(prov)) {
      provinsi = prov;
      break;
    }
  }
  // Try short forms
  if (!provinsi) {
    if (raw.includes("Sumatera Utara") || raw.includes("Sumut")) provinsi = "Sumatera Utara";
    else if (raw.includes("Sumatera Barat") || raw.includes("Sumbar")) provinsi = "Sumatera Barat";
    else if (raw.includes("Sumatera Selatan") || raw.includes("Sumsel")) provinsi = "Sumatera Selatan";
    else if (raw.includes("Jawa Barat") || raw.includes("Jabar")) provinsi = "Jawa Barat";
    else if (raw.includes("Jawa Tengah") || raw.includes("Jateng")) provinsi = "Jawa Tengah";
    else if (raw.includes("Jawa Timur") || raw.includes("Jatim")) provinsi = "Jawa Timur";
    else if (raw.includes("Kalimantan")) provinsi = "Kalimantan";
    else if (raw.includes("Sulawesi")) provinsi = "Sulawesi";
    else if (raw.toUpperCase().includes("NTT") || raw.includes("Nusa Tenggara Timur")) provinsi = "Nusa Tenggara Timur";
    else if (raw.toUpperCase().includes("NTB") || raw.includes("Nusa Tenggara Barat")) provinsi = "Nusa Tenggara Barat";
    else if (raw.includes("Maluku")) provinsi = "Maluku";
    else if (raw.includes("Papua")) provinsi = "Papua";
    else if (raw.includes("Banten")) provinsi = "Banten";
    else if (raw.includes("Bali")) provinsi = "Bali";
    else if (raw.includes("DKI") || raw.includes("Jakarta")) provinsi = "DKI Jakarta";
    else if (raw.includes("Lampung")) provinsi = "Lampung";
    else if (raw.includes("Riau")) provinsi = "Riau";
    else if (raw.includes("Jambi")) provinsi = "Jambi";
    else if (raw.includes("Bengkulu")) provinsi = "Bengkulu";
    else if (raw.includes("Aceh")) provinsi = "Aceh";
  }

  // Extract kecamatan
  let kecamatan = "";
  const kecMatch = raw.match(/Kec(?:amatan)?\.?\s+([^,;]+)/i);
  if (kecMatch) kecamatan = kecMatch[1].trim();

  // Extract kota/kabupaten
  let kotaKabupaten = "";
  const kotaMatch = raw.match(/(?:Kab(?:upaten)?\.?|Kota)\s+([^,;]+)/i);
  if (kotaMatch) kotaKabupaten = kotaMatch[1].trim();
  // Also look for "Kab." or "Kodya" or "Kota" patterns
  if (!kotaKabupaten) {
    const kabMatch = raw.match(/\bKab(?:\.|upaten)?\s+([A-Z][^,;]+)/i);
    if (kabMatch) kotaKabupaten = kabMatch[1].trim();
  }

  // Clean up address by removing extracted parts
  let alamat = raw
    .replace(kodePos, "")
    .replace(provinsi, "")
    .replace(kecamatan ? `Kec. ${kecamatan}` : "", "")
    .replace(kecamatan ? `Kecamatan ${kecamatan}` : "", "")
    .replace(kotaKabupaten ? `Kab. ${kotaKabupaten}` : "", "")
    .replace(kotaKabupaten ? `Kabupaten ${kotaKabupaten}` : "", "")
    .replace(kotaKabupaten ? `Kota ${kotaKabupaten}` : "", "")
    .replace(/\s+/g, " ")
    .replace(/[,;]+/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s]+/, "")
    .replace(/[,\s]+$/, "")
    .trim();

  if (!alamat) alamat = raw;

  return { provinsi, kotaKabupaten, kecamatan, alamat, kodePos };
}

// Build merged data map keyed by (zone, region, area, subArea)
const dataMap = new Map();
for (const row of rows) {
  const key = `${row.zone}||${row.region}||${row.area}||${row.subArea}`;
  dataMap.set(key, row);
}

// Now output the enriched data as a JS module
const outputPath = path.join(__dirname, "..", "src", "lib", "salesPointSeed.ts");
let output = `// Auto-generated from documents/master-pic-address_sales-point.csv
// Do not edit manually

export interface SalesPointPic {
  name: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  provinsi: string;
  kotaKabupaten: string;
  kecamatan: string;
  alamat: string;
  kodePos: string;
}

export interface SalesPointSeed {
  zone: string;
  region: string;
  area: string;
  subArea: string;
  pic1: SalesPointPic;
  pic2: SalesPointPic;
  remarks: string;
  note: string;
  shippingAddress: ShippingAddress;
}

export const salesPointSeeds: SalesPointSeed[] = [
`;

for (const row of rows) {
  const addr = parseAddress(row.alamatPengiriman);
  const pic2Name = row.pic2Name || "";
  const pic2Email = row.pic2Email || "";
  const pic2Phone = row.pic2Phone || "";

  output += `  {
    zone: ${JSON.stringify(row.zone)},
    region: ${JSON.stringify(row.region)},
    area: ${JSON.stringify(row.area)},
    subArea: ${JSON.stringify(row.subArea)},
    pic1: { name: ${JSON.stringify(row.pic1Name)}, email: ${JSON.stringify(row.pic1Email)}, phone: ${JSON.stringify(row.pic1Phone)} },
    pic2: { name: ${JSON.stringify(pic2Name)}, email: ${JSON.stringify(pic2Email)}, phone: ${JSON.stringify(pic2Phone)} },
    remarks: ${JSON.stringify(row.remarks)},
    note: ${JSON.stringify(row.note)},
    shippingAddress: {
      provinsi: ${JSON.stringify(addr.provinsi)},
      kotaKabupaten: ${JSON.stringify(addr.kotaKabupaten)},
      kecamatan: ${JSON.stringify(addr.kecamatan)},
      alamat: ${JSON.stringify(addr.alamat)},
      kodePos: ${JSON.stringify(addr.kodePos)},
    },
  },
`;
}

output += `];
`;

fs.writeFileSync(outputPath, output);
console.log(`Generated ${outputPath} with ${rows.length} entries`);
