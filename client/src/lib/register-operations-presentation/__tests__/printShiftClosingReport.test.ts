/**
 * FINANCIAL-SHIFT-CLOSING-PRINT-ISOLATION-1 — print pipeline behavior.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  printShiftClosingReport,
  SHIFT_CLOSING_PRINT_BODY_CLASS,
} from "../shiftClosingPresentation";

describe("printShiftClosingReport", () => {
  beforeEach(() => {
    document.body.className = "";
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.className = "";
  });

  it("adds isolation body class before window.print", () => {
    printShiftClosingReport();
    expect(document.body.classList.contains(SHIFT_CLOSING_PRINT_BODY_CLASS)).toBe(
      true
    );
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("removes isolation body class on afterprint", () => {
    printShiftClosingReport();
    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.classList.contains(SHIFT_CLOSING_PRINT_BODY_CLASS)).toBe(
      false
    );
  });
});
