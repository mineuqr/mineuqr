/**
 * CUSTOMER-CHECKOUT-UX-1C — post-submission journey lock (journey-scoped, not device/table permanent).
 */

export type CustomerJourneyPhase = "ordering" | "tracking";

export type CustomerJourneyRecord = {
  phase: CustomerJourneyPhase;
  slug: string;
  tableNumber: number;
  trackingToken: string;
  sessionToken?: string;
  lockedAt: string;
};

const JOURNEY_PREFIX = "mineuqr:customer-journey:";
const SEAL_PREFIX = "mineuqr:post-submit-seal:";

export type PostSubmitSealRecord = {
  trackingToken: string;
  sealedAt: string;
  /**
   * TABLE-QR-SAME-SESSION-FRESH-QR-NEW-ORDER-1
   * Identifies the document that submitted this journey. A later physical QR
   * scan loads a new document (different timeOrigin). Back / stale Cart /
   * Review stay on this document.
   */
  navigationStartedAt?: number;
};

/**
 * Stable per document load. Not a Session or Order identifier.
 */
export function readDocumentNavigationStartedAt(): number | null {
  if (typeof performance === "undefined") return null;
  if (typeof performance.timeOrigin === "number" && Number.isFinite(performance.timeOrigin)) {
    return performance.timeOrigin;
  }
  return null;
}

export function customerJourneyStorageKey(slug: string, tableNumber: number): string {
  return `${JOURNEY_PREFIX}${slug}:${tableNumber}`;
}

export function postSubmitSealStorageKey(slug: string, tableNumber: number): string {
  return `${SEAL_PREFIX}${slug}:${tableNumber}`;
}

export function loadCustomerJourney(
  slug: string,
  tableNumber: number
): CustomerJourneyRecord | null {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(customerJourneyStorageKey(slug, tableNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomerJourneyRecord>;
    if (
      parsed.phase !== "tracking" ||
      !parsed.slug ||
      !parsed.tableNumber ||
      !parsed.trackingToken
    ) {
      return null;
    }
    if (parsed.slug !== slug || parsed.tableNumber !== tableNumber) return null;
    return {
      phase: "tracking",
      slug: parsed.slug,
      tableNumber: parsed.tableNumber,
      trackingToken: parsed.trackingToken,
      sessionToken: parsed.sessionToken,
      lockedAt: parsed.lockedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function markCustomerJourneyTracking(record: {
  slug: string;
  tableNumber: number;
  trackingToken: string;
  sessionToken?: string;
}): CustomerJourneyRecord {
  const payload: CustomerJourneyRecord = {
    phase: "tracking",
    slug: record.slug,
    tableNumber: record.tableNumber,
    trackingToken: record.trackingToken,
    sessionToken: record.sessionToken,
    lockedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      customerJourneyStorageKey(record.slug, record.tableNumber),
      JSON.stringify(payload)
    );
  } catch {
    /* private mode / quota */
  }
  setPostSubmitSeal(record.slug, record.tableNumber, record.trackingToken);
  return payload;
}

export function setPostSubmitSeal(
  slug: string,
  tableNumber: number,
  trackingToken: string
): void {
  if (!slug || tableNumber <= 0 || typeof sessionStorage === "undefined") return;
  try {
    const payload: PostSubmitSealRecord = {
      trackingToken,
      sealedAt: new Date().toISOString(),
      navigationStartedAt: readDocumentNavigationStartedAt() ?? undefined,
    };
    sessionStorage.setItem(
      postSubmitSealStorageKey(slug, tableNumber),
      JSON.stringify(payload)
    );
  } catch {
    /* ignore */
  }
}

export function loadPostSubmitSeal(
  slug: string,
  tableNumber: number
): PostSubmitSealRecord | null {
  if (!slug || tableNumber <= 0 || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(postSubmitSealStorageKey(slug, tableNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PostSubmitSealRecord>;
    if (!parsed.trackingToken) return null;
    return {
      trackingToken: parsed.trackingToken,
      sealedAt: parsed.sealedAt ?? "",
      navigationStartedAt:
        typeof parsed.navigationStartedAt === "number" &&
        Number.isFinite(parsed.navigationStartedAt)
          ? parsed.navigationStartedAt
          : undefined,
    };
  } catch {
    return null;
  }
}

export function hasPostSubmitSeal(slug: string, tableNumber: number): boolean {
  return loadPostSubmitSeal(slug, tableNumber) != null;
}

/**
 * True when the current document is the same load that sealed the journey.
 * A physical QR scan starts a new document and returns false.
 */
export function isSameDocumentAsPostSubmitSeal(
  slug: string,
  tableNumber: number
): boolean {
  const seal = loadPostSubmitSeal(slug, tableNumber);
  if (!seal) return false;
  // Pre-existing seals without a document id fail closed: keep the journey locked.
  if (seal.navigationStartedAt == null) return true;
  const current = readDocumentNavigationStartedAt();
  if (current == null) return true;
  return current === seal.navigationStartedAt;
}

export function clearCustomerJourney(slug: string, tableNumber: number): void {
  if (!slug || tableNumber <= 0) return;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(customerJourneyStorageKey(slug, tableNumber));
    }
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(postSubmitSealStorageKey(slug, tableNumber));
    }
  } catch {
    /* ignore */
  }
}

/** For tests. */
export function resetCustomerJourneyForTests(): void {
  if (typeof localStorage !== "undefined") {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(JOURNEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }
  if (typeof sessionStorage !== "undefined") {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SEAL_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  }
}
