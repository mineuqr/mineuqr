import { describe, expect, it, vi } from "vitest";
import {
  cashierDashboardHomePath,
  cashierWorkspacePath,
  tryOpenCashierNewTab,
} from "../cashierWorkspaceNav";

describe("cashier workspace navigation helpers", () => {
  it("reuses Dashboard URL SSOT for cashier and return paths", () => {
    expect(cashierWorkspacePath(12)).toBe("/dashboard?restaurant=12&section=cashier");
    expect(cashierDashboardHomePath(12)).toBe("/dashboard?restaurant=12&section=home");
  });

  it("fails closed when window is unavailable", () => {
    expect(tryOpenCashierNewTab(12)).toBe(false);
  });

  it("fails gracefully when a new tab cannot be opened", () => {
    const open = vi.fn(() => null);
    vi.stubGlobal("window", { open });
    expect(tryOpenCashierNewTab(12)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("opens the existing Dashboard cashier URL when the browser allows it", () => {
    const opened = { closed: false };
    const open = vi.fn(() => opened);
    vi.stubGlobal("window", { open });
    expect(tryOpenCashierNewTab(12)).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "/dashboard?restaurant=12&section=cashier",
      "_blank",
      "noopener,noreferrer"
    );
    vi.unstubAllGlobals();
  });
});
