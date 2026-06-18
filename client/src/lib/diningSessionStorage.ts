/**
 * TABLE-MANAGEMENT-1 D4 — dining session recovery hint (client-only, localStorage).
 * Server is authoritative; this cache must be revalidated on menu mount.
 */

export type DiningSessionStorageRecord = {
  sessionToken: string;
  slug: string;
  tableNumber: number;
  cachedAt: string;
};

const PREFIX = "mineuqr:dining-session:";

export function diningSessionStorageKey(slug: string, tableNumber: number): string {
  return `${PREFIX}${slug}:${tableNumber}`;
}

export function saveDiningSession(record: {
  sessionToken: string;
  slug: string;
  tableNumber: number;
}): void {
  if (!record.slug || record.tableNumber <= 0 || !record.sessionToken) return;
  const payload: DiningSessionStorageRecord = {
    sessionToken: record.sessionToken,
    slug: record.slug,
    tableNumber: record.tableNumber,
    cachedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      diningSessionStorageKey(record.slug, record.tableNumber),
      JSON.stringify(payload)
    );
  } catch {
    /* private mode / quota */
  }
}

export function loadDiningSession(
  slug: string,
  tableNumber: number
): DiningSessionStorageRecord | null {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(diningSessionStorageKey(slug, tableNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiningSessionStorageRecord>;
    if (!parsed.sessionToken || !parsed.slug || !parsed.tableNumber) return null;
    if (parsed.slug !== slug || parsed.tableNumber !== tableNumber) return null;
    return {
      sessionToken: parsed.sessionToken,
      slug: parsed.slug,
      tableNumber: parsed.tableNumber,
      cachedAt: parsed.cachedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function clearDiningSession(slug: string, tableNumber: number): void {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(diningSessionStorageKey(slug, tableNumber));
  } catch {
    /* ignore */
  }
}

/** For tests. */
export function resetDiningSessionsForTests(): void {
  if (typeof localStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
