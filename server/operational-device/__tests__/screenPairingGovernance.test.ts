import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-PAIRING-CODE-1 — architecture guards", () => {
  it("ScreenPairingService is the pairing redeem owner", () => {
    const pairing = read("server/operational-device/pairing/ScreenPairingService.ts");
    expect(pairing).toContain("redeemPairingCode");
    expect(pairing).toContain("decryptRecoveryMaterial");
    expect(pairing).not.toContain("verifyDeviceSecret");
  });

  it("OperationalDeviceAuthService never decrypts recovery material", () => {
    const auth = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    expect(auth).not.toContain("decryptRecoveryMaterial");
    expect(auth).toContain("verifyDeviceSecret");
  });

  it("management router exposes pairingCode not secret", () => {
    const router = read("server/operational-device/routers/operationalDeviceManagementRouter.ts");
    expect(router).toContain("pairingCode: token.pairingCode");
    expect(router).not.toMatch(/secret:\s*token\.secret/);
  });

  it("runtime redeem endpoint is public bootstrap only", () => {
    const router = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    expect(router).toContain("redeemPairingCode: publicProcedure");
    expect(router).toContain("pairingService.redeemPairingCode");
  });

  it("pairing domain uses Pairing terminology in public contracts", () => {
    const pairingShell = read("client/src/components/operational-screen/PairingShell.tsx");
    const pairingService = read("server/operational-device/pairing/ScreenPairingService.ts");
    expect(pairingShell).toContain("Pairing Code");
    expect(pairingShell).toContain("redeemPairingCode");
    expect(pairingShell).not.toContain("Activation Code");
    expect(pairingShell).not.toContain("Token ID");
    expect(pairingService).toContain("Pairing");
    expect(pairingService).not.toContain("Activation Code");
  });

  it("/screen is the sole bootstrap entry — no operator-facing /screen/pair dependency", () => {
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    const screenEntryUrl = read("client/src/lib/screen-credential-lifecycle/screenEntryUrl.ts");

    expect(entry).toContain("PairingShell");
    expect(entry).not.toContain("/screen/pair");
    expect(orchestrator).toContain('spaNavigate("/screen"');
    expect(orchestrator).not.toContain('/screen/pair"');
    expect(screenEntryUrl).toContain('SCREEN_ENTRY_PATH = "/screen"');
  });
});
