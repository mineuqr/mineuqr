import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWindowsSpoolerScriptPath } from "./windowsSpoolerDeviceClient";

describe("resolveWindowsSpoolerScriptPath THERMAL-PRINTING-13I.2C-1", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers PRINT_AGENT_SPOOLER_SCRIPT_PATH when set", () => {
    vi.stubEnv("PRINT_AGENT_SPOOLER_SCRIPT_PATH", "C:\\custom\\spooler.ps1");
    expect(resolveWindowsSpoolerScriptPath()).toBe("C:\\custom\\spooler.ps1");
  });

  it("resolves bundled scripts directory layout", () => {
    vi.stubEnv("PRINT_AGENT_SPOOLER_SCRIPT_PATH", "");
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const bundledCandidate = join(moduleDir, "scripts", "windowsSpoolerRawPrint.ps1");
    const localCandidate = join(moduleDir, "windowsSpoolerRawPrint.ps1");

    const resolved = resolveWindowsSpoolerScriptPath();
    if (existsSync(bundledCandidate)) {
      expect(resolved).toBe(bundledCandidate);
      return;
    }
    expect(resolved).toBe(localCandidate);
  });
});
