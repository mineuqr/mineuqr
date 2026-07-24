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
      mapRegisterOperationsApiError({ data: { code: "NOT_FOUND" } })
    ).toBe("not_found");
    expect(
      mapRegisterOperationsApiError({ data: { code: "CONFLICT" } })
    ).toBe("conflict");
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
  });

  it("provides offline and permission copy", () => {
    expect(registerOperationsErrorMessage("offline", "ar")).toContain("اتصال");
    expect(registerOperationsErrorMessage("forbidden", "en")).toContain(
      "authorized"
    );
  });
});
