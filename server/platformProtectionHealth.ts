/**
 * ADMIN-SECURITY-CENTER PR-1 — OWNER_OPEN_ID fail-safe and security health foundation.
 * Authoritative openId matching remains in platformAccount.ts; this module owns startup policy.
 */
import { ENV } from "./_core/env";
import { emitAuditEvent } from "./audit/auditEmitter";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import { getUserByOpenId } from "./db";
import { getPlatformOwnerOpenId, isPlatformAccountOpenId } from "./platformAccount";

const OWNER_OPEN_ID_MAX_LEN = 64;
const OWNER_OPEN_ID_PREFIX_LEN = 8;

const DEGRADED_BANNER =
  "PLATFORM PROTECTION INACTIVE: OWNER_OPEN_ID is not configured. Platform account guards are disabled.";

export type PlatformProtectionEnvironment = "production" | "development" | "test";

export type SecurityWarningCode =
  | "OWNER_OPEN_ID_MISSING"
  | "OWNER_OPEN_ID_INVALID"
  | "PLATFORM_USER_NOT_RESOLVED"
  | "PLATFORM_USER_NOT_ADMIN";

export type SecurityWarning = {
  code: SecurityWarningCode;
  severity: "critical" | "warning" | "info";
  message: string;
};

export type SecurityHealthReport = {
  ownerOpenIdConfigured: boolean;
  platformUserResolved: boolean;
  platformUserId: number | null;
  protectionActive: boolean;
  warnings: SecurityWarning[];
};

export class PlatformProtectionStartupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformProtectionStartupError";
  }
}

export function getPlatformProtectionEnvironment(): PlatformProtectionEnvironment {
  if (process.env.NODE_ENV === "test") return "test";
  if (ENV.isProduction) return "production";
  return "development";
}

/** Trimmed non-empty OWNER_OPEN_ID within schema max length. */
export function isOwnerOpenIdConfigured(): boolean {
  return getOwnerOpenIdValidationError() === null;
}

export function getOwnerOpenIdValidationError(): string | null {
  const raw = ENV.ownerOpenId;
  const trimmed = raw.trim();
  if (!trimmed) {
    return "OWNER_OPEN_ID is missing or empty";
  }
  if (trimmed.length > OWNER_OPEN_ID_MAX_LEN) {
    return `OWNER_OPEN_ID exceeds maximum length (${OWNER_OPEN_ID_MAX_LEN})`;
  }
  return null;
}

export function getOwnerOpenIdPrefix(): string | null {
  const trimmed = ENV.ownerOpenId.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, OWNER_OPEN_ID_PREFIX_LEN);
}

function buildProtectionMetadata(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ownerOpenIdConfigured: isOwnerOpenIdConfigured(),
    ownerOpenIdPrefix: getOwnerOpenIdPrefix(),
    platformUserId: null,
    environment: getPlatformProtectionEnvironment(),
    ...extra,
  };
}

function emitPlatformProtectionEvent(
  type:
    | typeof OPS_EVENT.platform_protection_healthy
    | typeof OPS_EVENT.platform_protection_degraded
    | typeof OPS_EVENT.platform_protection_misconfigured,
  severity: "info" | "warn" | "error",
  metadata: Record<string, unknown>
): void {
  emitAuditEvent({
    eventType: type,
    category: "SECURITY",
    severity,
    opsCategory: "SECURITY",
    targetType: "platform",
    metadata,
  });
}

function buildWarningsFromProbe(params: {
  configured: boolean;
  validationError: string | null;
  platformUser: { id: number; role: string } | null;
}): SecurityWarning[] {
  const warnings: SecurityWarning[] = [];
  const { configured, validationError, platformUser } = params;

  if (!configured) {
    warnings.push({
      code: "OWNER_OPEN_ID_MISSING",
      severity: "critical",
      message: validationError ?? "OWNER_OPEN_ID is not configured",
    });
    return warnings;
  }

  if (validationError) {
    warnings.push({
      code: "OWNER_OPEN_ID_INVALID",
      severity: "critical",
      message: validationError,
    });
    return warnings;
  }

  if (!platformUser) {
    warnings.push({
      code: "PLATFORM_USER_NOT_RESOLVED",
      severity: "warning",
      message:
        "OWNER_OPEN_ID is configured but no matching user exists yet. Protection activates on first OAuth upsert.",
    });
    return warnings;
  }

  if (platformUser.role !== "admin") {
    warnings.push({
      code: "PLATFORM_USER_NOT_ADMIN",
      severity: "warning",
      message: "Platform owner user exists but does not have admin role.",
    });
  }

  return warnings;
}

/**
 * Async health probe — resolves platform user and derives protectionActive.
 * Foundation for future admin.getSecurityHealth (no route in PR-1).
 */
export async function getSecurityHealth(): Promise<SecurityHealthReport> {
  const validationError = getOwnerOpenIdValidationError();
  const configured = validationError === null;
  const ownerOpenId = getPlatformOwnerOpenId().trim();

  let platformUser: { id: number; role: string } | null = null;
  if (configured && ownerOpenId) {
    const user = await getUserByOpenId(ownerOpenId);
    if (user) {
      platformUser = { id: user.id, role: user.role };
    }
  }

  const warnings = buildWarningsFromProbe({
    configured,
    validationError,
    platformUser,
  });

  const protectionActive =
    configured &&
    isPlatformAccountOpenId(ownerOpenId) &&
    platformUser !== null &&
    platformUser.role === "admin";

  return {
    ownerOpenIdConfigured: configured,
    platformUserResolved: platformUser !== null,
    platformUserId: platformUser?.id ?? null,
    protectionActive,
    warnings,
  };
}

/**
 * Runs after startup when OWNER_OPEN_ID is configured. Never throws.
 */
export async function runPlatformProtectionHealthProbe(): Promise<SecurityHealthReport> {
  const health = await getSecurityHealth();
  const metadata = buildProtectionMetadata({
    platformUserId: health.platformUserId,
    protectionActive: health.protectionActive,
    warnings: health.warnings.map((w) => w.code),
  });

  if (!health.ownerOpenIdConfigured) {
    return health;
  }

  if (health.protectionActive) {
    emitPlatformProtectionEvent(OPS_EVENT.platform_protection_healthy, "info", metadata);
  } else {
    const severity = ENV.isProduction ? "error" : "warn";
    emitPlatformProtectionEvent(
      OPS_EVENT.platform_protection_misconfigured,
      severity,
      metadata
    );
  }

  return health;
}

/**
 * Synchronous startup gate — production fail-fast when OWNER_OPEN_ID is missing/invalid.
 */
export function validatePlatformProtectionAtStartup(): void {
  const validationError = getOwnerOpenIdValidationError();
  const configured = validationError === null;
  const environment = getPlatformProtectionEnvironment();

  if (!configured) {
    const metadata = buildProtectionMetadata({ validationError });

    if (ENV.isProduction) {
      emitPlatformProtectionEvent(
        OPS_EVENT.platform_protection_misconfigured,
        "error",
        metadata
      );
      throw new PlatformProtectionStartupError(
        `${validationError}. Set OWNER_OPEN_ID in production before starting the server.`
      );
    }

    emitPlatformProtectionEvent(OPS_EVENT.platform_protection_degraded, "warn", metadata);
    console.warn(`[PlatformProtection] ${DEGRADED_BANNER}`);
    return;
  }

  if (environment === "development") {
    console.info(
      `[PlatformProtection] OWNER_OPEN_ID configured (prefix=${getOwnerOpenIdPrefix() ?? "n/a"}). Scheduling health probe.`
    );
  }
}

/** Fire-and-forget health probe after successful startup validation. */
export function schedulePlatformProtectionHealthProbe(): void {
  if (!isOwnerOpenIdConfigured()) {
    return;
  }
  void runPlatformProtectionHealthProbe().catch((err) => {
    console.error("[PlatformProtection] Health probe failed:", err);
  });
}
