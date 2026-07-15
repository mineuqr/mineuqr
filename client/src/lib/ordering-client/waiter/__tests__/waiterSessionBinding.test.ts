import { describe, expect, it } from "vitest";
import { validateWaiterSessionBinding } from "../waiterSessionBinding";

const binding = {
  slug: "demo",
  tableNumber: 12,
  sessionId: 55,
  sessionToken: "aaaaaaaaaaaaaaaa",
};

describe("WAITER-SESSION-BINDING-HARDENING-1 validateWaiterSessionBinding", () => {
  it("accepts open token that matches active table session", () => {
    const open = {
      sessionToken: binding.sessionToken,
      status: "open",
      tableNumber: 12,
    };
    expect(
      validateWaiterSessionBinding({
        binding,
        byToken: open,
        activeByTable: open,
      })
    ).toEqual({ ok: true });
  });

  it("rejects closed / settled sessions", () => {
    expect(
      validateWaiterSessionBinding({
        binding,
        byToken: {
          sessionToken: binding.sessionToken,
          status: "closed",
          tableNumber: 12,
        },
        activeByTable: null,
      }).ok
    ).toBe(false);
  });

  it("rejects when a different session is now active on the table", () => {
    const result = validateWaiterSessionBinding({
      binding,
      byToken: {
        sessionToken: binding.sessionToken,
        status: "closed",
        tableNumber: 12,
      },
      activeByTable: {
        sessionToken: "bbbbbbbbbbbbbbbb",
        status: "open",
        tableNumber: 12,
      },
    });
    expect(result).toEqual({ ok: false, reason: "session_closed" });
  });

  it("rejects session_replaced when bound token still open but active differs", () => {
    const result = validateWaiterSessionBinding({
      binding,
      byToken: {
        sessionToken: binding.sessionToken,
        status: "open",
        tableNumber: 12,
      },
      activeByTable: {
        sessionToken: "bbbbbbbbbbbbbbbb",
        status: "open",
        tableNumber: 12,
      },
    });
    expect(result).toEqual({ ok: false, reason: "session_replaced" });
  });

  it("rejects table mismatch", () => {
    const result = validateWaiterSessionBinding({
      binding,
      byToken: {
        sessionToken: binding.sessionToken,
        status: "open",
        tableNumber: 99,
      },
      activeByTable: {
        sessionToken: binding.sessionToken,
        status: "open",
        tableNumber: 99,
      },
    });
    expect(result).toEqual({ ok: false, reason: "table_mismatch" });
  });

  it("does not invent or require a new session create path", () => {
    const result = validateWaiterSessionBinding({
      binding,
      byToken: null,
      activeByTable: {
        sessionToken: "bbbbbbbbbbbbbbbb",
        status: "open",
        tableNumber: 12,
      },
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});
