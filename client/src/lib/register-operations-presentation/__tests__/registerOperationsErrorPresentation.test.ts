/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
} from "../registerOperationsErrorPresentation";

describe("registerOperationsErrorPresentation (UX refinement)", () => {
  it("maps TRPC codes to kinds", () => {
    expect(
      mapRegisterOperationsApiError({
        data: { code: "NOT_FOUND" },
        message: "Register not found",
      })
    ).toBe("not_found");
    expect(
      mapRegisterOperationsApiError({
        data: { code: "NOT_FOUND" },
        message: "Financial Shift not found",
      })
    ).toBe("shift_not_found");
    expect(
      mapRegisterOperationsApiError({
        data: { code: "NOT_FOUND" },
        message: "No current financial shift",
      })
    ).toBe("no_current_shift");
    expect(
      mapRegisterOperationsApiError({ data: { code: "NOT_FOUND" } })
    ).toBe("unknown");
    expect(
      mapRegisterOperationsApiError({ data: { code: "CONFLICT" } })
    ).toBe("conflict");
    expect(
      mapRegisterOperationsApiError({
        data: { code: "CONFLICT" },
        message: "Register state is stale — refresh and retry",
      })
    ).toBe("stale_version");
    expect(
      mapRegisterOperationsApiError({
        data: { code: "CONFLICT" },
        message: "Final cash count does not match the recorded close count",
      })
    ).toBe("final_count_conflict");
    expect(
      mapRegisterOperationsApiError({
        data: { code: "CONFLICT" },
        message: "Register duty cannot close while a financial shift is active",
      })
    ).toBe("duty_blocked");
    expect(
      mapRegisterOperationsApiError({ data: { code: "FORBIDDEN" } })
    ).toBe("forbidden");
    expect(
      mapRegisterOperationsApiError({ data: { code: "BAD_REQUEST" } })
    ).toBe("bad_request");
    expect(
      mapRegisterOperationsApiError({ data: { code: "PRECONDITION_FAILED" } })
    ).toBe("unavailable");
  });

  it("never surfaces raw API or stack text", () => {
    const msg = registerOperationsErrorMessage("conflict", "en");
    expect(msg).not.toMatch(/at Object|Error:|stack|SELECT/i);
    expect(msg).toContain("refresh");
    expect(registerOperationsErrorMessage("stale_version", "en")).toContain(
      "stale"
    );
    expect(
      registerOperationsErrorMessage("final_count_conflict", "ar")
    ).toContain("العدّ");
    expect(registerOperationsErrorMessage("duty_blocked", "en")).toContain(
      "duty"
    );
    expect(registerOperationsErrorMessage("not_found", "ar")).toBe(
      "الصندوق غير موجود"
    );
    expect(registerOperationsErrorMessage("shift_not_found", "ar")).not.toBe(
      "الصندوق غير موجود"
    );
    expect(registerOperationsErrorMessage("shift_not_found", "en")).toContain(
      "shift"
    );
  });

  it("provides offline and permission copy", () => {
    expect(registerOperationsErrorMessage("offline", "ar")).toContain("اتصال");
    expect(registerOperationsErrorMessage("forbidden", "en")).toContain(
      "authorized"
    );
  });
});
