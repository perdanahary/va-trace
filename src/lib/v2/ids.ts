/** Stable ID and number generation for V2 aggregates. */

let counter = 0;

export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newIdempotencyKey(): string {
  return newId("idem");
}

/** Deterministic non-cryptographic checksum for QR payloads. */
export function checksum(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Sequential human-readable number, e.g. BATCH-20260318-0077. */
export function sequenceNumber(prefix: string, sequence: number, date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${datePart}-${String(sequence).padStart(4, "0")}`;
}
