import { describe, expect, it } from "vitest";
import { DISCOVER_PRINTERS_SCRIPT } from "../windowsPrinterDiscovery";

describe("DISCOVER_PRINTERS_SCRIPT", () => {
  it("uses newline-separated PowerShell (not semicolon-joined blocks)", () => {
    expect(DISCOVER_PRINTERS_SCRIPT).toContain("Get-Printer");
    expect(DISCOVER_PRINTERS_SCRIPT).toContain("Win32_Printer");
    expect(DISCOVER_PRINTERS_SCRIPT).not.toMatch(/ForEach-Object \{;/);
    expect(DISCOVER_PRINTERS_SCRIPT.split("\n").length).toBeGreaterThan(5);
  });
});
