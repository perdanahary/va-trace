export interface OrderReferenceLink {
  url: string;
  displayTitle?: string;
}

export function parseOrderTags(value: string): string[] {
  return normalizeOrderTags(value.split(/[,;\n]+/));
}

export function normalizeOrderTags(values: string[] | undefined | null): string[] {
  if (!values) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of values) {
    const tag = raw.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

export function normalizeOrderReferenceLink(link: OrderReferenceLink | undefined | null): OrderReferenceLink | undefined {
  if (!link) return undefined;

  const url = link.url.trim();
  if (!isValidHttpUrl(url)) return undefined;

  const displayTitle = link.displayTitle?.trim();
  return displayTitle ? { url, displayTitle } : { url };
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getOrderReferenceLinkLabel(link: OrderReferenceLink | undefined | null): string {
  if (!link) return "";
  return link.displayTitle?.trim() || link.url;
}

