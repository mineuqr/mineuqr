/**
 * ADMIN-SECURITY-CENTER PR-1 — OWNER_OPEN_ID fail-safe tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPS_EVENT } from "./_core/opsTaxonomy";

const { PLATFORM_OPEN_ID, envMock } = vi.hoisted(() => ({
  PLATFORM_OPEN_ID: "platform_owner_open_id_pr1",
  envMock: {
    ownerOpenId: "platform_owner_open_id_pr1",
    isProduction: false,
  },
}));

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("./_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

vi.mock("./_core/env", () => ({
  ENV: envMock,
}));

vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(),
}));

import { getUserByOpenId } from "./db";
import {
  getSecurityHealth,
  PlatformProtectionStartupError,
  runPlatformProtectionHealthProbe,
  validatePlatformProtectionAtStartup,
} from "./platformProtectionHealth";

describe("platformProtectionHealth PR-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMock.ownerOpenId = PLATFORM_OPEN_ID;
    envMock.isProduction = false;
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Scenario 1 — OWNER_OPEN_ID configured", () => {
    it("startup succeeds and emits healthy event when platform user is resolved", async () => {
      (getUserByOpenId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 1,
        openId: PLATFORM_OPEN_ID,
        role: "admin",
      });

      expect(() => validatePlatformProtectionAtStartup()).not.toThrow();

      const health = await runPlatformProtectionHealthProbe();
      expect(health.protectionActive).toBe(true);
      expect(health.platformUserId).toBe(1);

      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.platform_protection_healthy,
          category: "SECURITY",
          severity: "info",
        })
      );
    });
  });

  describe("Scenario 2 — development + OWNER_OPEN_ID missing", () => {
    it("startup succeeds and emits degraded warning", () => {
      envMock.ownerOpenId = "";
      envMock.isProduction = false;
      vi.stubEnv("NODE_ENV", "development");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => validatePlatformProtectionAtStartup()).not.toThrow();

      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.platform_protection_degraded,
          category: "SECURITY",
          severity: "warn",
        })
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("PLATFORM PROTECTION INACTIVE")
      );

      warnSpy.mockRestore();
    });
  });

  describe("Scenario 3 — production + OWNER_OPEN_ID missing", () => {
    it("startup fails and emits misconfigured event", () => {
      envMock.ownerOpenId = "";
      envMock.isProduction = true;
      vi.stubEnv("NODE_ENV", "production");

      expect(() => validatePlatformProtectionAtStartup()).toThrow(
        PlatformProtectionStartupError
      );

      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.platform_protection_misconfigured,
          category: "SECURITY",
          severity: "error",
        })
      );
    });
  });

  describe("getSecurityHealth foundation", () => {
    it("returns protectionActive false when OWNER_OPEN_ID is missing", async () => {
      envMock.ownerOpenId = "";

      const health = await getSecurityHealth();

      expect(health.ownerOpenIdConfigured).toBe(false);
      expect(health.protectionActive).toBe(false);
      expect(health.warnings.some((w) => w.code === "OWNER_OPEN_ID_MISSING")).toBe(true);
    });

    it("returns misconfigured probe when user not resolved yet", async () => {
      (getUserByOpenId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const health = await runPlatformProtectionHealthProbe();

      expect(health.ownerOpenIdConfigured).toBe(true);
      expect(health.platformUserResolved).toBe(false);
      expect(health.protectionActive).toBe(false);
      expect(opsLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: OPS_EVENT.platform_protection_misconfigured,
          severity: "warn",
        })
      );
    });
  });
});
