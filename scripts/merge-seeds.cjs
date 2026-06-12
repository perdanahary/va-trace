#!/usr/bin/env node
// Merge Master_PIC_Address.csv into salesPointSeed.ts, deduplicating by (zone, region, area, subArea)

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.resolve(__dirname, "../docs/masterdata/Master_PIC_Address.csv");
const SEED_PATH = path.resolve(__dirname, "../src/lib/salesPointSeed.ts");
const OUTPUT_PATH = SEED_PATH;

// ── 1. Parse CSV (semicolons, handle quoted multiline fields) ──────────────
function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n") {
        current.push(field.trim());
        field = "";
        if (current.some((f) => f !== "")) rows.push(current);
        current = [];
      } else if (ch === "\r") {
        // skip CR
      } else {
        field += ch;
      }
    }
  }
  // last line
  if (field || current.length) {
    current.push(field.trim());
    if (current.some((f) => f !== "")) rows.push(current);
  }

  return rows;
}

const csvText = fs.readFileSync(CSV_PATH, "utf-8");
const csvRows = parseCSV(csvText);
const csvHeader = csvRows[0]; // Zone;Region;Area;SubArea;PIC1;...
const csvData = csvRows.slice(1);

// ── 2. Build CSV lookup map ────────────────────────────────────────────────
const csvMap = new Map();
for (const row of csvData) {
  if (row.length < 13) continue;
  const key = `${row[0]}|${row[1]}|${row[2]}|${row[3]}`;
  csvMap.set(key, {
    zone: row[0],
    region: row[1],
    area: row[2],
    subArea: row[3],
    pic1: { name: row[4] || "", email: row[5] || "", phone: row[6] || "" },
    pic2: { name: row[7] || "", email: row[8] || "", phone: row[9] || "" },
    remarks: row[10] || "",
    note: row[12] || "",
    alamat: row[11] || "",
  });
}

// ── 3. Parse existing seed file, extract current entries ───────────────────
const seedText = fs.readFileSync(SEED_PATH, "utf-8");

// Find the section between "export const salesPointSeeds: SalesPointSeed[] = [" and the closing "];"
const seedsDecl = "export const salesPointSeeds: SalesPointSeed[] = [";
const seedsStart = seedText.indexOf(seedsDecl);
const arrayStart = seedsStart + seedsDecl.length - 1; // the `[` at end of decl
// Find the matching closing bracket
let depth = 0;
let arrayEnd = -1;
for (let i = arrayStart; i < seedText.length; i++) {
  if (seedText[i] === "[") depth++;
  if (seedText[i] === "]") {
    depth--;
    if (depth === 0) { arrayEnd = i; break; }
  }
}

// Extract preamble (everything before the array)
const preamble = seedText.substring(0, arrayStart + 1);
// Extract postamble (everything after the array closing bracket)
const postamble = seedText.substring(arrayEnd);

// Parse each seed object from the array content
const arrayContent = seedText.substring(arrayStart + 1, arrayEnd);

// Check for stub section marker
const stubMarkerIndex = arrayContent.indexOf("// Added from docs/masterdata/addresses_cleaned.csv");
let existingEntriesText;
if (stubMarkerIndex >= 0) {
  // Find the last entry before the stub section
  const beforeStubs = arrayContent.substring(0, stubMarkerIndex);
  // Find the last complete seed entry before stubs
  existingEntriesText = beforeStubs;
} else {
  existingEntriesText = arrayContent;
}

// Parse existing seed objects using a simple state machine
function parseSeedObjects(text) {
  const seeds = [];
  let depth2 = 0;
  let start = -1;
  let braceStart = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth2 === 0) braceStart = i;
      depth2++;
    }
    if (ch === "}") {
      depth2--;
      if (depth2 === 0 && braceStart >= 0) {
        const objStr = text.substring(braceStart, i + 1);
        const seed = parseSeedObject(objStr);
        if (seed) seeds.push(seed);
        braceStart = -1;
      }
    }
  }
  return seeds;
}

function parseSeedObject(str) {
  try {
    const zone = extractField(str, "zone");
    const region = extractField(str, "region");
    const area = extractField(str, "area");
    const subArea = extractField(str, "subArea");
    if (!zone && !region && !area && !subArea) return null;

    return {
      zone,
      region,
      area,
      subArea,
      pic1: extractPic(str, "pic1"),
      pic2: extractPic(str, "pic2"),
      remarks: extractField(str, "remarks") || "",
      note: extractField(str, "note") || "",
      shippingAddress: extractShippingAddress(str),
      _raw: str,
    };
  } catch {
    return null;
  }
}

function extractField(str, name) {
  // Match `name: "value"` or `name: 'value'` - handle escaped quotes
  const re = new RegExp(`${name}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = str.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`${name}\\s*:\\s*'((?:[^'\\\\]|\\\\.)*)'`);
  const m2 = str.match(re2);
  return m2 ? m2[1] : "";
}

function extractPic(str, name) {
  const picRegex = new RegExp(
    `${name}\\s*:\\s*\\{\\s*name\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,\\s*email\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,\\s*phone\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*\\}`
  );
  const m = str.match(picRegex);
  if (m) return { name: m[1] || "", email: m[2] || "", phone: m[3] || "" };
  return { name: "", email: "", phone: "" };
}

function extractShippingAddress(str) {
  const saRegex = /shippingAddress\s*:\s*\{([^}]+)\}/;
  const m = str.match(saRegex);
  if (!m) return { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" };

  const inner = m[1];
  return {
    provinsi: extractFieldInner(inner, "provinsi"),
    kotaKabupaten: extractFieldInner(inner, "kotaKabupaten"),
    kecamatan: extractFieldInner(inner, "kecamatan"),
    alamat: extractFieldInner(inner, "alamat"),
    kodePos: extractFieldInner(inner, "kodePos"),
  };
}

function extractFieldInner(str, name) {
  const re = new RegExp(`${name}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = str.match(re);
  return m ? m[1] : "";
}

const existingSeeds = parseSeedObjects(existingEntriesText);
console.log(`Parsed ${existingSeeds.length} existing seed entries`);

// ── 4. Merge ──────────────────────────────────────────────────────────────
// Build merged map keyed by (zone|region|area|subArea)
const mergedMap = new Map();

// First, add all existing seeds
for (const seed of existingSeeds) {
  const key = `${seed.zone}|${seed.region}|${seed.area}|${seed.subArea}`;
  mergedMap.set(key, { ...seed });
}

// Then upsert from CSV
let csvMatched = 0;
let csvNew = 0;
for (const [csvKey, csvRow] of csvMap) {
  if (mergedMap.has(csvKey)) {
    // Update existing entry with CSV data
    const existing = mergedMap.get(csvKey);
    existing.pic1 = csvRow.pic1.name ? { ...csvRow.pic1 } : existing.pic1;
    existing.pic2 = csvRow.pic2.name ? { ...csvRow.pic2 } : existing.pic2;
    existing.remarks = csvRow.remarks || existing.remarks;
    existing.note = csvRow.note || existing.note;
    if (csvRow.alamat) {
      existing.shippingAddress = { ...existing.shippingAddress, alamat: csvRow.alamat };
    }
    csvMatched++;
  } else {
    // New entry from CSV
    mergedMap.set(csvKey, {
      zone: csvRow.zone,
      region: csvRow.region,
      area: csvRow.area,
      subArea: csvRow.subArea,
      pic1: csvRow.pic1,
      pic2: csvRow.pic2,
      remarks: csvRow.remarks,
      note: csvRow.note,
      shippingAddress: {
        provinsi: "",
        kotaKabupaten: "",
        kecamatan: "",
        alamat: csvRow.alamat,
        kodePos: "",
      },
    });
    csvNew++;
  }
}

console.log(`CSV rows matched existing seeds: ${csvMatched}`);
console.log(`New entries from CSV: ${csvNew}`);

// ── 5. Add the 2 stubs NOT in CSV (Pasar Minggu, DPC Kalianda) ────────────
const manualStubs = [];

// Pasar Minggu - not in CSV
const pasarMingguKey = "Jakarta|Jakarta Inner|Jakarta Timur|Pasar Minggu";
if (!mergedMap.has(pasarMingguKey)) {
  manualStubs.push({
    zone: "Jakarta",
    region: "Jakarta Inner",
    area: "Jakarta Timur",
    subArea: "Pasar Minggu",
    pic1: { name: "", email: "", phone: "" },
    pic2: { name: "", email: "", phone: "" },
    remarks: "",
    note: "",
    shippingAddress: { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" },
  });
  mergedMap.set(pasarMingguKey, manualStubs[manualStubs.length - 1]);
}

// DPC Kalianda - not in CSV
const kaliandaKey = "South Sumatera|Sumatera 4|Bandar Lampung|DPC Kalianda";
if (!mergedMap.has(kaliandaKey)) {
  manualStubs.push({
    zone: "South Sumatera",
    region: "Sumatera 4",
    area: "Bandar Lampung",
    subArea: "DPC Kalianda",
    pic1: { name: "", email: "", phone: "" },
    pic2: { name: "", email: "", phone: "" },
    remarks: "",
    note: "",
    shippingAddress: { provinsi: "", kotaKabupaten: "", kecamatan: "", alamat: "", kodePos: "" },
  });
  mergedMap.set(kaliandaKey, manualStubs[manualStubs.length - 1]);
}

// ── 6. Generate output ─────────────────────────────────────────────────────
function quote(s) {
  return JSON.stringify(s || "");
}

function formatPic(pic) {
  return `{ name: ${quote(pic.name)}, email: ${quote(pic.email)}, phone: ${quote(pic.phone)} }`;
}

function formatShippingAddress(sa) {
  return `{\n      provinsi: ${quote(sa.provinsi)},\n      kotaKabupaten: ${quote(sa.kotaKabupaten)},\n      kecamatan: ${quote(sa.kecamatan)},\n      alamat: ${quote(sa.alamat)},\n      kodePos: ${quote(sa.kodePos)},\n    }`;
}

function formatSeed(seed) {
  return `  {\n    zone: ${quote(seed.zone)},\n    region: ${quote(seed.region)},\n    area: ${quote(seed.area)},\n    subArea: ${quote(seed.subArea)},\n    pic1: ${formatPic(seed.pic1)},\n    pic2: ${formatPic(seed.pic2)},\n    remarks: ${quote(seed.remarks)},\n    note: ${quote(seed.note)},\n    shippingAddress: ${formatShippingAddress(seed.shippingAddress)},\n  }`;
}

// Sort entries by (zone, region, area, subArea) for consistent ordering
const sortedEntries = [...mergedMap.values()].sort((a, b) => {
  const cmp = (x, y) => (x || "").localeCompare(y || "");
  return cmp(a.zone, b.zone) || cmp(a.region, b.region) || cmp(a.area, b.area) || cmp(a.subArea, b.subArea);
});

// Build new array content
const headerComment = `// Auto-generated from docs/masterdata/Master_PIC_Address.csv (${csvData.length} rows)\n// + docs/masterdata/addresses_cleaned.csv (2 stub entries: Pasar Minggu, DPC Kalianda)\n// Do not edit manually\n`;

const arrayBody = sortedEntries.map(formatSeed).join(",\n");
const output = `${headerComment}
${preamble}
${arrayBody},
${postamble}
`;

fs.writeFileSync(OUTPUT_PATH, output, "utf-8");
console.log(`\nDone! Wrote ${sortedEntries.length} entries to ${OUTPUT_PATH}`);
