/**
 * ORDER-CREATE-IDEMPOTENCY-PERSISTENCE-AND-LEGACY-HARDENING-1
 * Tab-scoped in-flight Table/QR submission identity.
 * Survives refresh/remount. Not Session, tracking, or financial identity.
 * Does not store dining-session secrets, auth, or payment data.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Abandoned in-tab attempts expire so a later intentional order is not a replay. */
export const ORDER_CREATE_SUBMISSION_TTL_MS = 30 * 60 * 1000;

export type TableOrderCreatePayloadDigestInput = {
  restaurantId: number;
  tableNumber: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  items: ReadonlyArray<{
    menuItemId: number;
    quantity: number;
    notes?: string | null;
    modifiers?: readonly string[] | null;
  }>;
};

export type TableOrderCreateSubmissionRecord = {
  submissionId: string;
  restaurantId: number;
  tableNumber: number;
  payloadDigest: string;
  startedAt: number;
};

export function tableOrderCreateSubmissionStorageKey(
  restaurantId: number,
  tableNumber: number
): string {
  return `mineuqr:order-create-submission:${restaurantId}:${tableNumber}`;
}

function normalizeText(value: string | null | undefined): string {
  return value == null ? "" : value.trim();
}

/** Local equality digest — not the server fingerprint and not financial authority. */
export function digestTableOrderCreatePayload(
  input: TableOrderCreatePayloadDigestInput
): string {
  const canonical = {
    restaurantId: input.restaurantId,
    tableNumber: input.tableNumber,
    customerName: normalizeText(input.customerName),
    customerPhone: normalizeText(input.customerPhone),
    notes: normalizeText(input.notes),
    items: [...input.items]
      .map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: normalizeText(item.notes),
        modifiers: [...(item.modifiers ?? [])]
          .map((modifier) => modifier.trim())
          .filter((modifier) => modifier.length > 0)
          .sort(),
      }))
      .sort((a, b) => {
        if (a.menuItemId !== b.menuItemId) return a.menuItemId - b.menuItemId;
        if (a.quantity !== b.quantity) return a.quantity - b.quantity;
        if (a.notes !== b.notes) return a.notes.localeCompare(b.notes);
        return a.modifiers.join("\0").localeCompare(b.modifiers.join("\0"));
      }),
  };
  const json = JSON.stringify(canonical);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${json.length.toString(16)}:${(hash >>> 0).toString(16)}`;
}

function readRaw(
  restaurantId: number,
  tableNumber: number
): TableOrderCreateSubmissionRecord | null {
  if (typeof sessionStorage === "undefined") return null;
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) return null;
  if (!Number.isInteger(tableNumber) || tableNumber <= 0) return null;
  try {
    const raw = sessionStorage.getItem(
      tableOrderCreateSubmissionStorageKey(restaurantId, tableNumber)
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TableOrderCreateSubmissionRecord>;
    if (
      typeof parsed.submissionId !== "string" ||
      !UUID_PATTERN.test(parsed.submissionId) ||
      parsed.restaurantId !== restaurantId ||
      parsed.tableNumber !== tableNumber ||
      typeof parsed.payloadDigest !== "string" ||
      parsed.payloadDigest.length === 0 ||
      typeof parsed.startedAt !== "number" ||
      !Number.isFinite(parsed.startedAt)
    ) {
      return null;
    }
    return {
      submissionId: parsed.submissionId,
      restaurantId: parsed.restaurantId,
      tableNumber: parsed.tableNumber,
      payloadDigest: parsed.payloadDigest,
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function readTableOrderCreateSubmission(
  restaurantId: number,
  tableNumber: number,
  nowMs = Date.now()
): TableOrderCreateSubmissionRecord | null {
  const record = readRaw(restaurantId, tableNumber);
  if (!record) return null;
  if (nowMs - record.startedAt > ORDER_CREATE_SUBMISSION_TTL_MS) {
    clearTableOrderCreateSubmission(restaurantId, tableNumber);
    return null;
  }
  return record;
}

export function beginTableOrderCreateSubmission(
  input: {
    restaurantId: number;
    tableNumber: number;
    payloadDigest: string;
  },
  options?: {
    nowMs?: number;
    createId?: () => string;
  }
): string {
  const nowMs = options?.nowMs ?? Date.now();
  const existing = readTableOrderCreateSubmission(
    input.restaurantId,
    input.tableNumber,
    nowMs
  );
  if (existing && existing.payloadDigest === input.payloadDigest) {
    return existing.submissionId;
  }
  const submissionId = (options?.createId ?? crypto.randomUUID)();
  writeTableOrderCreateSubmission({
    submissionId,
    restaurantId: input.restaurantId,
    tableNumber: input.tableNumber,
    payloadDigest: input.payloadDigest,
    startedAt: nowMs,
  });
  return submissionId;
}

function writeTableOrderCreateSubmission(
  record: TableOrderCreateSubmissionRecord
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      tableOrderCreateSubmissionStorageKey(record.restaurantId, record.tableNumber),
      JSON.stringify(record)
    );
  } catch {
    /* private mode / quota — in-memory retry still works for the same page */
  }
}

export function clearTableOrderCreateSubmission(
  restaurantId: number,
  tableNumber: number
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(
      tableOrderCreateSubmissionStorageKey(restaurantId, tableNumber)
    );
  } catch {
    /* ignore */
  }
}
