import { describe, expect, it } from "vitest";
import {
  accountEmailChanged,
  normalizeAccountEmail,
  normalizeAccountEmailOrNull,
} from "./normalizeAccountEmail";

describe("normalizeAccountEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeAccountEmail("  Owner@Example.COM  ")).toBe("owner@example.com");
  });

  it("returns null for empty after trim", () => {
    expect(normalizeAccountEmailOrNull("   ")).toBeNull();
    expect(normalizeAccountEmailOrNull(null)).toBeNull();
  });

  it("detects email change case-insensitively", () => {
    expect(accountEmailChanged("A@b.co", "a@b.co")).toBe(false);
    expect(accountEmailChanged("a@b.co", "c@d.co")).toBe(true);
    expect(accountEmailChanged(null, "a@b.co")).toBe(true);
  });
});
