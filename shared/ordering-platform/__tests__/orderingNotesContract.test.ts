import { describe, expect, it } from "vitest";
import {
  validateOrderNote,
  validateItemNote,
  resolveOrderNoteInput,
  resolveItemNoteInput,
  ORDERING_ORDER_NOTE_MAX_LENGTH,
  ORDERING_ITEM_NOTE_MAX_LENGTH,
  DEFAULT_ORDERING_NOTES_CAPABILITIES,
} from "../orderingNotesContract";

describe("ORDERING-NOTES-ARCHITECTURE-1 orderingNotesContract", () => {
  it("validates and normalizes order notes", () => {
    expect(validateOrderNote("  No utensils  ")).toEqual({
      ok: true,
      value: "No utensils",
    });
    expect(validateOrderNote("   ")).toEqual({ ok: true, value: null });
    expect(validateOrderNote(null)).toEqual({ ok: true, value: null });
    const tooLong = "x".repeat(ORDERING_ORDER_NOTE_MAX_LENGTH + 1);
    expect(validateOrderNote(tooLong).ok).toBe(false);
  });

  it("validates item notes independently", () => {
    expect(validateItemNote("No pickles")).toEqual({
      ok: true,
      value: "No pickles",
    });
    const tooLong = "y".repeat(ORDERING_ITEM_NOTE_MAX_LENGTH + 1);
    expect(validateItemNote(tooLong).ok).toBe(false);
  });

  it("resolves canonical aliases without losing legacy notes", () => {
    expect(resolveOrderNoteInput({ orderNotes: "A", notes: "B" })).toBe("A");
    expect(resolveOrderNoteInput({ notes: "B" })).toBe("B");
    expect(resolveItemNoteInput({ itemNotes: "X", notes: "Y" })).toBe("X");
    expect(resolveItemNoteInput({ notes: "Y" })).toBe("Y");
  });

  it("exposes default platform note capabilities", () => {
    expect(DEFAULT_ORDERING_NOTES_CAPABILITIES.supportsOrderNotes).toBe(true);
    expect(DEFAULT_ORDERING_NOTES_CAPABILITIES.supportsItemNotes).toBe(true);
  });
});
