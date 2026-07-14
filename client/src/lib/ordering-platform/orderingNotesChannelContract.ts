import {
  ORDERING_ORDER_NOTE_MAX_LENGTH,
  ORDERING_ITEM_NOTE_MAX_LENGTH,
  DEFAULT_ORDERING_NOTES_CAPABILITIES,
} from "@shared/ordering-platform/orderingNotesContract";

/**
 * ORDERING-NOTES-ARCHITECTURE-1 — QR consumes shared Ordering Notes contracts.
 * Presentation only — validation/capabilities owned by the Ordering Platform.
 */
export const QR_ORDERING_NOTES_CONTRACT =
  "shared/ordering-platform/orderingNotesContract.ts" as const;

export const QR_SUPPORTED_NOTE_TYPES = ["order", "item"] as const;

export const QR_ORDERING_NOTES_LIMITS = {
  maxOrderNoteLength: ORDERING_ORDER_NOTE_MAX_LENGTH,
  maxItemNoteLength: ORDERING_ITEM_NOTE_MAX_LENGTH,
} as const;

/** Kiosk must use the same platform contracts — no channel-specific note models. */
export const KIOSK_ORDERING_NOTES_CONTRACT = QR_ORDERING_NOTES_CONTRACT;

export const ORDERING_NOTES_DEFAULT_CAPABILITIES = DEFAULT_ORDERING_NOTES_CAPABILITIES;
