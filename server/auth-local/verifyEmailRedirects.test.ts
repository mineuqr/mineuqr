import { describe, expect, it } from "vitest";
import {
  VERIFY_EMAIL_SUCCESS_PATH,
  verifyEmailFailurePath,
} from "./verifyEmailRedirects";

describe("verifyEmailRedirects", () => {
  it("maps success to SPA path", () => {
    expect(VERIFY_EMAIL_SUCCESS_PATH).toBe("/verify-email/success");
  });

  it("maps failure reasons to SPA query paths", () => {
    expect(verifyEmailFailurePath("invalid")).toBe(
      "/verify-email/failed?reason=invalid"
    );
    expect(verifyEmailFailurePath("expired")).toBe(
      "/verify-email/failed?reason=expired"
    );
    expect(verifyEmailFailurePath("error")).toBe(
      "/verify-email/failed?reason=error"
    );
  });
});
