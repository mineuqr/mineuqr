import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-AUTH-RECOVERY-1 architecture guards", () => {
  it("orchestrator recovers from device auth errors before status payload exists", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");

    expect(orchestrator).toContain("SCREEN-AUTH-RECOVERY-1");
    expect(orchestrator).toContain("handleRevoked");

    const recoveryStart = orchestrator.indexOf("SCREEN-AUTH-RECOVERY-1");
    const bootstrapStart = orchestrator.indexOf("Bootstrap executes once when validating");
    expect(recoveryStart).toBeGreaterThan(-1);
    expect(bootstrapStart).toBeGreaterThan(recoveryStart);

    const recoveryBlock = orchestrator.slice(recoveryStart, bootstrapStart);
    expect(recoveryBlock).toContain("isDeviceAuthError(statusQuery.error)");
    expect(recoveryBlock).toContain("handleRevoked()");

    const bootstrapBlock = orchestrator.slice(
      bootstrapStart,
      orchestrator.indexOf("Reconciliation is event-driven", bootstrapStart)
    );
    expect(bootstrapBlock).toContain("if (statusQuery.error) return;");
    expect(bootstrapBlock).toMatch(/if \(statusQuery\.error\) return;[\s\S]*if \(!statusQuery\.data\) return;/);
  });

  it("reuses existing credential cleanup and pairing redirect", () => {
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    expect(orchestrator).toContain("clearOperationalScreenCredentials");
    expect(orchestrator).toContain('spaNavigate("/screen/pair"');
    expect(orchestrator).not.toContain("refreshToken");
    expect(orchestrator).not.toContain("retryCredential");
  });
});
