import { describe, expect, it } from "vitest";
import { newToken, tokenToHash } from "./authTokenUtils";

describe("authTokenUtils", () => {
  it("newToken returns 64-char hex", () => {
    const token = newToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(newToken()).not.toBe(token);
  });

  it("tokenToHash is stable SHA-256 hex", () => {
    const hash = tokenToHash("abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenToHash("abc")).toBe(hash);
  });
});
