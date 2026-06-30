import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINT-CONNECTOR-WINDOWS-1 simulation guards", () => {
  it("Windows adapter does not fall back to simulated printers on discovery failure", () => {
    const source = readFileSync(join(platformRoot, "windows", "WindowsPlatformAdapter.ts"), "utf8");
    expect(source).not.toMatch(/catch[\s\S]*SimulatedPlatformAdapter\("windows"\)/);
    expect(source).toContain("return []");
  });

  it("Linux adapter does not fall back to simulated printers on discovery failure", () => {
    const source = readFileSync(join(platformRoot, "linux", "LinuxPlatformAdapter.ts"), "utf8");
    expect(source).not.toMatch(/catch[\s\S]*SimulatedPlatformAdapter\("linux"\)/);
  });

  it("Darwin adapter does not fall back to simulated printers on discovery failure", () => {
    const source = readFileSync(join(platformRoot, "darwin", "DarwinPlatformAdapter.ts"), "utf8");
    expect(source).not.toMatch(/catch[\s\S]*SimulatedPlatformAdapter\("macos"\)/);
  });

  it("Windows adapter uses PowerShell not lp", () => {
    const adapterSource = readFileSync(join(platformRoot, "windows", "WindowsPlatformAdapter.ts"), "utf8");
    const discoverySource = readFileSync(join(platformRoot, "windows", "windowsPrinterDiscovery.ts"), "utf8");
    expect(adapterSource).toContain("powershell.exe");
    expect(adapterSource).toContain("Out-Printer");
    expect(adapterSource).not.toContain('spawn("lp"');
    expect(adapterSource).not.toContain("lpstat");
    expect(discoverySource).toContain("Get-Printer");
  });
});
