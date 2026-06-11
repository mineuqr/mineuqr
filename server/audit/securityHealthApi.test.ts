/**
 * ADMIN-SECURITY-CENTER PR-6 — security health API tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../platformProtectionHealth", () => ({
  getSecurityHealth: vi.fn(),
  getOwnerOpenIdPrefix: vi.fn(() => "platform"),
  getPlatformProtectionEnvironment: vi.fn(() => "development"),
}));

vi.mock("./auditReadRepository", () => ({
  probeAuditPersistence: vi.fn(),
}));

import { getSecurityHealth as getPlatformProtectionHealth } from "../platformProtectionHealth";
import { probeAuditPersistence } from "./auditReadRepository";
import { getAdminSecurityHealth } from "./securityHealthApi";

describe("securityHealthApi PR-6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (probeAuditPersistence as ReturnType<typeof vi.fn>).mockResolvedValue({
      databaseAvailable: true,
      auditTableReadable: true,
    });
  });

  it("returns healthy when protection active and audit readable", async () => {
    (getPlatformProtectionHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerOpenIdConfigured: true,
      platformUserResolved: true,
      platformUserId: 1,
      protectionActive: true,
      warnings: [],
    });

    const health = await getAdminSecurityHealth();
    expect(health.status).toBe("healthy");
    expect(health.protectionActive).toBe(true);
    expect(health.auditPersistence.auditTableReadable).toBe(true);
  });

  it("returns warning when platform user not resolved", async () => {
    (getPlatformProtectionHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerOpenIdConfigured: true,
      platformUserResolved: false,
      platformUserId: null,
      protectionActive: false,
      warnings: [
        {
          code: "PLATFORM_USER_NOT_RESOLVED",
          severity: "warning",
          message: "not resolved",
        },
      ],
    });

    const health = await getAdminSecurityHealth();
    expect(health.status).toBe("warning");
  });

  it("returns critical when OWNER_OPEN_ID missing", async () => {
    (getPlatformProtectionHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerOpenIdConfigured: false,
      platformUserResolved: false,
      platformUserId: null,
      protectionActive: false,
      warnings: [
        {
          code: "OWNER_OPEN_ID_MISSING",
          severity: "critical",
          message: "missing",
        },
      ],
    });

    const health = await getAdminSecurityHealth();
    expect(health.status).toBe("critical");
  });

  it("returns critical when audit table is not readable", async () => {
    (getPlatformProtectionHealth as ReturnType<typeof vi.fn>).mockResolvedValue({
      ownerOpenIdConfigured: true,
      platformUserResolved: true,
      platformUserId: 1,
      protectionActive: true,
      warnings: [],
    });
    (probeAuditPersistence as ReturnType<typeof vi.fn>).mockResolvedValue({
      databaseAvailable: true,
      auditTableReadable: false,
    });

    const health = await getAdminSecurityHealth();
    expect(health.status).toBe("critical");
  });
});
