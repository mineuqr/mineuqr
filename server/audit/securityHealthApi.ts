/**
 * ADMIN-SECURITY-CENTER PR-6 — admin security health API composition.
 * Reuses platformProtectionHealth foundation; does not duplicate probe logic.
 */
import {
  getOwnerOpenIdPrefix,
  getPlatformProtectionEnvironment,
  getSecurityHealth as getPlatformProtectionHealth,
  type SecurityHealthReport,
  type SecurityWarning,
} from "../platformProtectionHealth";
import { probeAuditPersistence, type AuditPersistenceProbe } from "./auditReadRepository";

export type SecurityHealthStatus = "healthy" | "warning" | "critical";

export type AdminSecurityHealthResponse = SecurityHealthReport & {
  status: SecurityHealthStatus;
  ownerOpenIdPrefix: string | null;
  environment: ReturnType<typeof getPlatformProtectionEnvironment>;
  auditPersistence: AuditPersistenceProbe;
};

function deriveSecurityHealthStatus(params: {
  platform: SecurityHealthReport;
  auditPersistence: AuditPersistenceProbe;
}): SecurityHealthStatus {
  const { platform, auditPersistence } = params;

  const hasCriticalWarning = platform.warnings.some((w) => w.severity === "critical");
  if (hasCriticalWarning) {
    return "critical";
  }

  if (!auditPersistence.databaseAvailable || !auditPersistence.auditTableReadable) {
    return "critical";
  }

  const hasWarning = platform.warnings.some((w) => w.severity === "warning");
  if (hasWarning || !platform.protectionActive) {
    return "warning";
  }

  return "healthy";
}

export async function getAdminSecurityHealth(): Promise<AdminSecurityHealthResponse> {
  const [platform, auditPersistence] = await Promise.all([
    getPlatformProtectionHealth(),
    probeAuditPersistence(),
  ]);

  return {
    ...platform,
    status: deriveSecurityHealthStatus({ platform, auditPersistence }),
    ownerOpenIdPrefix: getOwnerOpenIdPrefix(),
    environment: getPlatformProtectionEnvironment(),
    auditPersistence,
  };
}

export type { SecurityWarning };
