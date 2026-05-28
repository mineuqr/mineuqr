import { describe, expect, it } from "vitest";
import { _safeDecodeOAuthState } from "./oauth";

describe("_safeDecodeOAuthState", () => {
  it("returns ok for valid base64 state", () => {
    const state = btoa("https://example.com/callback");
    const result = _safeDecodeOAuthState(state);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUri).toContain("https://example.com/callback");
    }
  });

  it("rejects malformed base64 state", () => {
    const result = _safeDecodeOAuthState("%%%not-base64%%%");
    expect(result).toEqual({ ok: false, reason: "malformed" });
  });
});

