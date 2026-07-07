import { describe, expect, it } from "vitest";
import {
  generateActivationCode,
  hashActivationCode,
  isValidActivationCodeFormat,
  normalizeActivationCode,
} from "../infrastructure/deviceCrypto";

describe("device activation code", () => {
  it("generates XXXX-XXXX format", () => {
    const code = generateActivationCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(isValidActivationCodeFormat(code)).toBe(true);
  });

  it("normalizes user input", () => {
    expect(normalizeActivationCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(hashActivationCode("ABCD-EFGH")).toBe(hashActivationCode("abcdefgh"));
  });
});
