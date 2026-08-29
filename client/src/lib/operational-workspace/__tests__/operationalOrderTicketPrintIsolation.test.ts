/**
 * ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1 — isolation body class + window.print.
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS,
  printOperationalOrderTicket,
} from "../operationalOrderTicket";

describe("printOperationalOrderTicket isolation", () => {
  beforeEach(() => {
    document.body.className = "";
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.className = "";
  });

  it("adds isolation body class before window.print", () => {
    printOperationalOrderTicket();
    expect(
      document.body.classList.contains(OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS)
    ).toBe(true);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("removes isolation body class on afterprint so the screen dialog stays intact", () => {
    printOperationalOrderTicket();
    window.dispatchEvent(new Event("afterprint"));
    expect(
      document.body.classList.contains(OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS)
    ).toBe(false);
  });

  it("allows a second print without mutating document beyond the isolation class", () => {
    printOperationalOrderTicket();
    window.dispatchEvent(new Event("afterprint"));
    printOperationalOrderTicket();
    expect(window.print).toHaveBeenCalledTimes(2);
    expect(
      document.body.classList.contains(OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS)
    ).toBe(true);
  });
});
