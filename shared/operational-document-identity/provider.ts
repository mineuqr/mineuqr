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
 * Settlement / Receipt Operational Identity.
 * Derives sequence from Check id (presentation facts only — not domain logic).
 * Persistence Identity (`sr:…`) is never returned (OI-03).
 */
export function resolveSettlementOperationalIdentity(
  input: ResolveSettlementOperationalIdentityInput
): string {
  const generation =
    input.recordGeneration != null && input.recordGeneration > 0
      ? input.recordGeneration
      : parseGenerationFromSettlementRecordId(input.settlementRecordId);
  return formatOperationalIdentity({
    documentType: "settlement",
    sequence: input.checkId,
    generation,
  });
}

/** Receipt Operational Identity — Settlement Reference (same ST- value). */
export function resolveReceiptOperationalIdentity(
  input: ResolveSettlementOperationalIdentityInput
): string {
  return formatOperationalIdentity({
    documentType: "receipt",
    sequence: input.checkId,
    generation:
      input.recordGeneration != null && input.recordGeneration > 0
        ? input.recordGeneration
        : parseGenerationFromSettlementRecordId(input.settlementRecordId),
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
