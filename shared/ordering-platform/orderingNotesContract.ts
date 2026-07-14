/**
 * ORDERING-NOTES-ARCHITECTURE-1 — canonical Ordering Notes contracts.
 *
 * Two independent note types owned by the Ordering Platform:
 * - Order Notes → belong to the complete order
 * - Item Notes → belong exclusively to a single line item
 *
 * Channels own presentation only. Validation & capabilities are platform-owned.
 */

/** Default max lengths — platform policy defaults (channels must not redefine). */
export const ORDERING_ORDER_NOTE_MAX_LENGTH = 500 as const;
export const ORDERING_ITEM_NOTE_MAX_LENGTH = 300 as const;

export type OrderingNoteKind = "order" | "item";

/**
 * Runtime-exposed note capabilities — OrderingRuntimeContext.capabilities.notes
 * (and mirrored under policies for discovery).
 */
export type OrderingNotesCapabilities = Readonly<{
  supportsOrderNotes: boolean;
  supportsItemNotes: boolean;
  maxOrderNoteLength: number;
  maxItemNoteLength: number;
  /** Policy keys channels may display; channels never invent policies. */
  allowedPolicies: readonly string[];
}>;

export const DEFAULT_ORDERING_NOTES_CAPABILITIES: OrderingNotesCapabilities =
  Object.freeze({
    supportsOrderNotes: true,
    supportsItemNotes: true,
    maxOrderNoteLength: ORDERING_ORDER_NOTE_MAX_LENGTH,
    maxItemNoteLength: ORDERING_ITEM_NOTE_MAX_LENGTH,
    allowedPolicies: Object.freeze(["plain_text"] as const),
  });

export type OrderingNotesValidationResult =
  | { ok: true; value: string | null }
  | { ok: false; code: string; message: string };

function normalizeNoteText(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Platform-owned order note validation.
 * Empty / whitespace → null (no note). Over-length → reject.
 */
export function validateOrderNote(
  raw: string | null | undefined,
  maxLength: number = ORDERING_ORDER_NOTE_MAX_LENGTH
): OrderingNotesValidationResult {
  const value = normalizeNoteText(raw);
  if (value == null) return { ok: true, value: null };
  if (value.length > maxLength) {
    return {
      ok: false,
      code: "ORDER_NOTE_TOO_LONG",
      message: `Order note exceeds max length (${maxLength})`,
    };
  }
  return { ok: true, value };
}

/**
 * Platform-owned item note validation.
 * Empty / whitespace → null. Over-length → reject.
 */
export function validateItemNote(
  raw: string | null | undefined,
  maxLength: number = ORDERING_ITEM_NOTE_MAX_LENGTH
): OrderingNotesValidationResult {
  const value = normalizeNoteText(raw);
  if (value == null) return { ok: true, value: null };
  if (value.length > maxLength) {
    return {
      ok: false,
      code: "ITEM_NOTE_TOO_LONG",
      message: `Item note exceeds max length (${maxLength})`,
    };
  }
  return { ok: true, value };
}

/** Resolve order note from canonical or legacy field names. */
export function resolveOrderNoteInput(input: {
  orderNotes?: string | null;
  notes?: string | null;
}): string | null | undefined {
  if (input.orderNotes !== undefined) return input.orderNotes;
  return input.notes;
}

/** Resolve item note from canonical or legacy field names. */
export function resolveItemNoteInput(input: {
  itemNotes?: string | null;
  notes?: string | null;
}): string | null | undefined {
  if (input.itemNotes !== undefined) return input.itemNotes;
  return input.notes;
}
