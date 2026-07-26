/**
 * OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 — Operational Identity Provider.
 *
 * Sole formatter for human-facing document identities (OI-07 / OI-08).
 * Presentation layers MUST call this provider — never compose IDs locally.
 * Operational Identity NEVER participates in domain / money logic (OI-04 / OI-05).
 */

import {
  getOperationalDocumentSpec,
  type OperationalDocumentType,
} from "./registry";

export type OperationalIdentitySequenceInput = Readonly<{
  documentType: OperationalDocumentType;
  /** Positive sequence / business number used for the digit segment. */
  sequence: number;
  /**
   * Optional generation / revision suffix (Settlement compensating records).
   * Omitted or 1 → no suffix.
   */
  generation?: number | null;
}>;

export type ResolveSettlementOperationalIdentityInput = Readonly<{
  checkId: number;
  settlementRecordId?: string | null;
  recordGeneration?: number | null;
}>;

export type ResolveRefundOperationalIdentityInput = Readonly<{
  /** Restaurant-scoped immutable refund document sequence (positive integer). */
  sequence: number;
}>;

function padDigits(value: number, digits: number): string {
  const n = Math.max(0, Math.trunc(value));
  return String(n).padStart(digits, "0");
}

function parseGenerationFromSettlementRecordId(
  settlementRecordId: string | null | undefined
): number {
  const id = settlementRecordId?.trim() ?? "";
  if (!id.startsWith("sr:")) return 1;
  const parts = id.split(":");
  const gen = Number.parseInt(parts[4] ?? "1", 10);
  return Number.isFinite(gen) && gen > 0 ? gen : 1;
}

/**
 * Format a registered document type into its Operational Identity string.
 * Example: ST-000001, K-000042, WT-000007-2
 */
export function formatOperationalIdentity(
  input: OperationalIdentitySequenceInput
): string {
  const resolvedType =
    getOperationalDocumentSpec(input.documentType).aliasesTo ??
    input.documentType;
  const spec = getOperationalDocumentSpec(resolvedType);
  const sequence = Number(input.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return `${spec.prefix}-${padDigits(0, spec.digits)}`;
  }
  const base = `${spec.prefix}-${padDigits(sequence, spec.digits)}`;
  const generation = input.generation ?? 1;
  if (Number.isFinite(generation) && generation > 1) {
    return `${base}-${Math.trunc(generation)}`;
  }
  return base;
}

/**
 * Settlement Operational Identity.
 * Derives sequence from Check id (presentation facts only — not domain logic).
 * Persistence Identity (`sr:…`) is never returned (OI-03).
 * Refund documents MUST NOT use this — see resolveRefundOperationalIdentity.
 */
export function resolveSettlementOperationalIdentity(
  input: ResolveSettlementOperationalIdentityInput
): string {
  const generation =
    input.recordGeneration != null && input.recordGeneration > 0
      ? input.recordGeneration
      : parseGenerationFromSettlementRecordId(input.settlementRecordId);
  // Refund compensating publications use generation > 1 historically for ST suffix.
  // Primary settlement display omits generation when 1.
  return formatOperationalIdentity({
    documentType: "settlement",
    sequence: input.checkId,
    // Origin Settlement identity never carries refund generation suffixes.
    generation: 1,
  });
}

/**
 * Refund Operational Identity — independent RF- sequence (REFUND-DOCUMENT-NUMBERING-ADOPTION-1).
 * Sequence is allocated at publish time; never derived from Check / ST numbers.
 */
export function resolveRefundOperationalIdentity(
  input: ResolveRefundOperationalIdentityInput
): string {
  return formatOperationalIdentity({
    documentType: "refund",
    sequence: input.sequence,
  });
}

/**
 * Receipt Operational Identity.
 * Settlement receipts → ST reference.
 * Refund receipts → RF document number (caller supplies refund sequence).
 */
export function resolveReceiptOperationalIdentity(
  input: ResolveSettlementOperationalIdentityInput & {
    recordKind?: string | null;
    refundSequence?: number | null;
  }
): string {
  if (
    input.recordKind === "refund" &&
    input.refundSequence != null &&
    input.refundSequence > 0
  ) {
    return resolveRefundOperationalIdentity({ sequence: input.refundSequence });
  }
  return formatOperationalIdentity({
    documentType: "receipt",
    sequence: input.checkId,
    generation: 1,
  });
}

export function resolveSessionOperationalIdentity(sessionId: number): string {
  return formatOperationalIdentity({
    documentType: "session",
    sequence: sessionId,
  });
}

export function resolveCheckOperationalIdentity(checkId: number): string {
  return formatOperationalIdentity({
    documentType: "check",
    sequence: checkId,
  });
}

export function resolveTableOperationalIdentity(tableNumber: number): string {
  return formatOperationalIdentity({
    documentType: "table",
    sequence: tableNumber,
  });
}

export function resolveKitchenTicketOperationalIdentity(
  sequence: number
): string {
  return formatOperationalIdentity({
    documentType: "kitchen_ticket",
    sequence,
  });
}

/** Validate that a string matches the registered prefix + digit pattern. */
export function isValidOperationalIdentityFormat(
  documentType: OperationalDocumentType,
  value: string
): boolean {
  const resolvedType =
    getOperationalDocumentSpec(documentType).aliasesTo ?? documentType;
  const spec = getOperationalDocumentSpec(resolvedType);
  const escaped = spec.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^${escaped}-\\d{${spec.digits}}(-\\d+)?$`
  );
  return re.test(value.trim());
}

export type ParsedSettlementOperationalIdentity = Readonly<{
  checkId: number;
  recordGeneration: number;
  /** Normalized operational identity (ST-…). */
  settlementNumber: string;
  /**
   * Lookup channel — manual entry today; reserved for barcode/QR/scanner.
   */
  channel: "manual";
}>;

export type ParsedRefundOperationalIdentity = Readonly<{
  sequence: number;
  refundNumber: string;
  channel: "manual";
}>;

export type ParsedLedgerDocumentSearch = Readonly<
  | {
      kind: "settlement";
      checkId: number;
      settlementNumber: string;
    }
  | {
      kind: "refund";
      sequence: number;
      refundNumber: string;
    }
  | {
      kind: "check";
      checkId: number;
    }
>;

/**
 * Parse Settlement Operational Identity for ledger lookup (presentation / transport).
 * Accepts `ST-000570004`, `ST-570004`, optional generation suffix (ignored for origin ST),
 * or bare check digits.
 * Does not participate in money logic (OI-04 / OI-05).
 */
export function parseSettlementOperationalIdentity(
  raw: string
): ParsedSettlementOperationalIdentity | null {
  const value = raw.trim().toUpperCase();
  if (!value || isPersistenceIdentityLeak(value)) return null;

  const st = value.match(/^ST-(\d+)(?:-(\d+))?$/i);
  if (st) {
    const checkId = Number.parseInt(st[1]!, 10);
    const generation = st[2] ? Number.parseInt(st[2], 10) : 1;
    if (!Number.isFinite(checkId) || checkId <= 0) return null;
    if (!Number.isFinite(generation) || generation <= 0) return null;
    return {
      checkId,
      recordGeneration: generation,
      settlementNumber: resolveSettlementOperationalIdentity({
        checkId,
        recordGeneration: 1,
      }),
      channel: "manual",
    };
  }

  // Bare positive digits → Check sequence (extensible scanner path may emit digits).
  if (/^\d{1,12}$/.test(value)) {
    const checkId = Number.parseInt(value, 10);
    if (!Number.isFinite(checkId) || checkId <= 0) return null;
    return {
      checkId,
      recordGeneration: 1,
      settlementNumber: resolveSettlementOperationalIdentity({
        checkId,
        recordGeneration: 1,
      }),
      channel: "manual",
    };
  }

  return null;
}

/**
 * Parse Refund Operational Identity (`RF-000001` / `RF-1`).
 */
export function parseRefundOperationalIdentity(
  raw: string
): ParsedRefundOperationalIdentity | null {
  const value = raw.trim().toUpperCase();
  if (!value || isPersistenceIdentityLeak(value)) return null;
  const rf = value.match(/^RF-(\d+)$/i);
  if (!rf) return null;
  const sequence = Number.parseInt(rf[1]!, 10);
  if (!Number.isFinite(sequence) || sequence <= 0) return null;
  return {
    sequence,
    refundNumber: resolveRefundOperationalIdentity({ sequence }),
    channel: "manual",
  };
}

/**
 * Parse ledger search tokens: RF-… | ST-… | bare Check digits.
 */
export function parseLedgerDocumentSearch(
  raw: string
): ParsedLedgerDocumentSearch | null {
  const refund = parseRefundOperationalIdentity(raw);
  if (refund) {
    return {
      kind: "refund",
      sequence: refund.sequence,
      refundNumber: refund.refundNumber,
    };
  }
  const settlement = parseSettlementOperationalIdentity(raw);
  if (settlement) {
    if (/^\d{1,12}$/.test(raw.trim())) {
      return { kind: "check", checkId: settlement.checkId };
    }
    return {
      kind: "settlement",
      checkId: settlement.checkId,
      settlementNumber: settlement.settlementNumber,
    };
  }
  return null;
}

/**
 * Guard: Persistence Identity patterns must never be treated as operational.
 */
export function isPersistenceIdentityLeak(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("sr:")) return true;
  if (v.startsWith("fin:")) return true;
  if (v.startsWith("evt_")) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return true;
  }
  return false;
}
