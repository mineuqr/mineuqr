/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
} from "../registerOperationsErrorPresentation";

describe("registerOperationsErrorPresentation", () => {
  it("maps TRPC codes", () => {
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
  });

  it("prefers safe API message for conflict", () => {
    const msg = registerOperationsErrorMessage(
      "conflict",
      "en",
      "Register unavailable while a financial shift is active"
    );
    expect(msg).toContain("financial shift");
  });

  it("never echoes stack-like messages", () => {
    const msg = registerOperationsErrorMessage(
      "unknown",
      "en",
      "Error: boom\n    at Object.<anonymous>"
    );
    expect(msg).not.toMatch(/at Object/);
    expect(msg).toBe("Could not complete register operation");
  });
});
