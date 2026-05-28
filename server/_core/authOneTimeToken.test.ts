import { describe, expect, it } from "vitest";
import {
  AUTH_ONE_TIME_TOKEN_PURPOSE,
  authTokenExpiresAtIso,
  classifyAuthOneTimeToken,
  isAuthTokenExpired,
  isPlausibleOneTimeTokenFromBody,
  isPlausibleOneTimeTokenFromQuery,
  issueAuthOneTimeToken,
  ONE_TIME_TOKEN_MIN_LENGTH,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "./authOneTimeToken";

describe("authOneTimeToken", () => {
  it("exposes stable DB purpose literals", () => {
    expect(AUTH_ONE_TIME_TOKEN_PURPOSE.passwordReset).toBe("password_reset");
    expect(AUTH_ONE_TIME_TOKEN_PURPOSE.emailVerification).toBe("email_verify");
  });

  it("body vs query plausibility checks preserve trim semantics", () => {
    const core = "x".repeat(ONE_TIME_TOKEN_MIN_LENGTH);
    expect(isPlausibleOneTimeTokenFromBody(`  ${core}  `)).toBe(true);

    // Long on the wire but too short after trim (body) — query does not trim.
    const paddedShortCore = `${" ".repeat(15)}${"x".repeat(10)}`;
    expect(isPlausibleOneTimeTokenFromBody(paddedShortCore)).toBe(false);
    expect(isPlausibleOneTimeTokenFromQuery(paddedShortCore)).toBe(true);
  });

  it("classifies missing, consumed, expired, valid", () => {
    const now = 1_700_000_000_000;
    expect(classifyAuthOneTimeToken(null, now)).toBe("missing");
    expect(
      classifyAuthOneTimeToken(
        { id: 1, userId: 2, expiresAt: authTokenExpiresAtIso(60_000, now), usedAt: "t" },
        now
      )
    ).toBe("consumed");
    expect(
      classifyAuthOneTimeToken(
        { id: 1, userId: 2, expiresAt: new Date(now - 1).toISOString(), usedAt: null },
        now
      )
    ).toBe("expired");
    expect(
      classifyAuthOneTimeToken(
        { id: 1, userId: 2, expiresAt: authTokenExpiresAtIso(60_000, now), usedAt: null },
        now
      )
    ).toBe("valid");
  });

  it("issueAuthOneTimeToken matches TTL helper", () => {
    const now = 2_000_000_000_000;
    const issued = issueAuthOneTimeToken(PASSWORD_RESET_TOKEN_TTL_MS, now);
    expect(issued.plaintextToken).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.expiresAt).toBe(authTokenExpiresAtIso(PASSWORD_RESET_TOKEN_TTL_MS, now));
    expect(
      isAuthTokenExpired(issued.expiresAt, now + PASSWORD_RESET_TOKEN_TTL_MS - 1)
    ).toBe(false);
    expect(isAuthTokenExpired(issued.expiresAt, now + PASSWORD_RESET_TOKEN_TTL_MS)).toBe(
      true
    );
  });
});
