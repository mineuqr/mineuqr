import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SCREEN-PAIRING-CODE-GOVERNANCE-1 — architecture guards", () => {
  it("pairing redeem endpoint enforces rate limits", () => {
    const router = read("server/operational-device/routers/operationalDeviceRuntimeRouter.ts");
    expect(router).toContain("enforcePairingRedeemRateLimit");
    expect(router).toContain("redeemPairingCode");
  });

  it("pairing service never authenticates runtime sessions", () => {
    const pairing = read("server/operational-device/pairing/ScreenPairingService.ts");
    const auth = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    expect(pairing).not.toContain("verifyDeviceSecret");
    expect(pairing).not.toContain("authenticate(");
    expect(auth).not.toContain("decryptRecoveryMaterial");
  });

  it("pairing audit uses opsLog taxonomy without plaintext codes", () => {
    const audit = read("server/operational-device/governance/pairingAudit.ts");
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(audit).toContain("opsLog");
    expect(audit).toContain("pairing_code_redeemed");
    expect(audit).not.toMatch(/pairingCode/);
    expect(taxonomy).toContain("pairing_code_issued");
    expect(taxonomy).toContain("pairing_rate_limit_exceeded");
  });

  it("management lifecycle mutations emit pairing audit events", () => {
    const management = read("server/operational-device/routers/operationalDeviceManagementRouter.ts");
    expect(management).toContain("logOperationalScreenCreated");
    expect(management).toContain("logPairingCredentialRegenerated");
    expect(management).toContain("logPairingScreenDeleted");
    expect(management).toContain("logPairingRevoked");
  });

  it("consumeActivationCode is conditional for one-time redeem", () => {
    const drizzle = read("server/operational-device/infrastructure/DrizzleOperationalDeviceStore.ts");
    const inMemory = read("server/operational-device/infrastructure/InMemoryOperationalDeviceStore.ts");
    expect(drizzle).toContain("isNotNull");
    expect(drizzle).toContain("Promise<boolean>");
    expect(inMemory).toContain("activationCodeHash == null) return false");
  });

  it("runtime auth uses Device authorization scheme only", () => {
    const auth = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    const security = read("server/operational-device/governance/pairingSecurityGovernance.ts");
    expect(auth).toContain('startsWith("device ")');
    expect(security).toContain("pairingCodeNeverInAuthorization");
  });

  it("client pairing UI remains embedded at /screen without engineering terms", () => {
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");
    const panel = read("client/src/components/operational-screen/pairing/PairingScreenPanel.tsx");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");
    expect(entry).toContain("PairingShell");
    expect(panel).not.toContain("deviceId");
    expect(panel).not.toContain("tokenId");
    expect(orchestrator).toContain('spaNavigate("/screen"');
    expect(orchestrator).not.toContain('/screen/pair"');
  });

  it("recovery returns to embedded pairing without store regressions", () => {
    const store = read("client/src/lib/operational-screen/credentialStore.ts");
    const recovery = read("client/src/lib/operational-screen/__tests__/authRecovery.guards.test.ts");
    expect(store).toContain("cachedSnapshot");
    expect(recovery).toContain("clearOperationalScreenCredentials");
    expect(recovery).toContain('spaNavigate("/screen"');
  });

  it("QR remains optional in screen management onboarding", () => {
    const fields = read("client/src/components/screen-management/ScreenOnboardingFields.tsx");
    expect(fields).toContain("ScreenOnboardingOptionalQr");
    expect(fields).toContain("<details");
    expect(fields).toContain("optionalQr");
  });
});
