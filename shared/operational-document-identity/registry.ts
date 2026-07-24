/**
 * OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 — document type catalog.
 * Canonical registry. No document may invent its own format.
 */

export const OPERATIONAL_DOCUMENT_IDENTITY_STANDARD_ID =
  "OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1" as const;

export const OPERATIONAL_DOCUMENT_TYPES = [
  "order_kiosk",
  "order_qr",
  "order_waiter",
  "table",
  "session",
  "check",
  "settlement",
  "receipt",
  "kitchen_ticket",
] as const;

export type OperationalDocumentType = (typeof OPERATIONAL_DOCUMENT_TYPES)[number];

export type OperationalDocumentOwner =
  | "Order"
  | "Session"
  | "Check"
  | "Settlement";

export type OperationalDocumentIdentitySpec = Readonly<{
  documentType: OperationalDocumentType;
  /** Human-facing prefix (e.g. ST, K, WT). */
  prefix: string;
  /** Zero-padded digit width for the sequence segment. */
  digits: number;
  /** Owning Aggregate (OI-05). */
  owner: OperationalDocumentOwner;
  /** Short operational description. */
  description: string;
  /**
   * When true, operational identity is an alias of another document type
   * (e.g. Receipt → Settlement).
   */
  aliasesTo?: OperationalDocumentType;
}>;

/**
 * Canonical Operational Identity Registry (prefix + digit + ownership policy).
 * Format examples: ST-000001, K-000001, WT-000001, Q-000001, T-0001, S-000001, C-000001, KT-000001.
 */
export const OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY: Readonly<
  Record<OperationalDocumentType, OperationalDocumentIdentitySpec>
> = {
  order_kiosk: {
    documentType: "order_kiosk",
    prefix: "K",
    digits: 6,
    owner: "Order",
    description: "Self-ordering / kiosk / counter Order",
  },
  order_qr: {
    documentType: "order_qr",
    prefix: "Q",
    digits: 6,
    owner: "Order",
    description: "QR table guest Order",
  },
  order_waiter: {
    documentType: "order_waiter",
    prefix: "WT",
    digits: 6,
    owner: "Order",
    description: "Waiter-placed Order",
  },
  table: {
    documentType: "table",
    prefix: "T",
    digits: 4,
    owner: "Session",
    description: "Physical table label (not Order Business Identity T #)",
  },
  session: {
    documentType: "session",
    prefix: "S",
    digits: 6,
    owner: "Session",
    description: "Dining / operational Session",
  },
  check: {
    documentType: "check",
    prefix: "C",
    digits: 6,
    owner: "Check",
    description: "Guest Check",
  },
  settlement: {
    documentType: "settlement",
    prefix: "ST",
    digits: 6,
    owner: "Settlement",
    description: "Settlement Record operational document",
  },
  receipt: {
    documentType: "receipt",
    prefix: "ST",
    digits: 6,
    owner: "Settlement",
    description: "Customer Receipt — Settlement Reference",
    aliasesTo: "settlement",
  },
  kitchen_ticket: {
    documentType: "kitchen_ticket",
    prefix: "KT",
    digits: 6,
    owner: "Order",
    description: "Kitchen ticket operational identity",
  },
} as const;

export function getOperationalDocumentSpec(
  documentType: OperationalDocumentType
): OperationalDocumentIdentitySpec {
  const spec = OPERATIONAL_DOCUMENT_IDENTITY_REGISTRY[documentType];
  if (!spec) {
    throw new Error(`Unregistered operational document type: ${documentType}`);
  }
  return spec;
}

export function listOperationalDocumentTypes(): readonly OperationalDocumentType[] {
  return OPERATIONAL_DOCUMENT_TYPES;
}

export function assertOperationalDocumentRegistered(
  documentType: string
): asserts documentType is OperationalDocumentType {
  if (
    !(OPERATIONAL_DOCUMENT_TYPES as readonly string[]).includes(documentType)
  ) {
    throw new Error(
      `AG-7: document type "${documentType}" must be registered in the Operational Identity Registry before implementation`
    );
  }
}
