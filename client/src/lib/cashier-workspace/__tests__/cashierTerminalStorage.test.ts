/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1 — last-used terminal reminder only.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  cashierTerminalStorageKey,
  isCashierTerminalId,
  readCashierTerminalId,
  writeCashierTerminalId,
} from "../cashierTerminalStorage";

describe("cashier terminal session reminder", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v);
        },
        removeItem: (k: string) => {
          memory.delete(k);
        },
      },
    });
  });

  it("accepts UUID terminal ids and rejects garbage", () => {
    expect(isCashierTerminalId("3f1c0a8e-2b4d-4a6f-8c1e-9d2b3a4c5d6e")).toBe(true);
    expect(isCashierTerminalId("not-a-terminal")).toBe(false);
    expect(isCashierTerminalId("")).toBe(false);
    expect(isCashierTerminalId(null)).toBe(false);
  });

  it("persists per restaurant and does not invent authorization", () => {
    const id = "3f1c0a8e-2b4d-4a6f-8c1e-9d2b3a4c5d6e";
    writeCashierTerminalId(7, id);
    expect(readCashierTerminalId(7)).toBe(id);
    expect(readCashierTerminalId(8)).toBeNull();
    expect(memory.get(cashierTerminalStorageKey(7))).toBe(id);
    writeCashierTerminalId(7, "nope");
    expect(readCashierTerminalId(7)).toBeNull();
  });
});
