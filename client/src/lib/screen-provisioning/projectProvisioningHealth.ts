import type { ProvisioningHealth, ProvisioningSession } from "./provisioningSessionContract";

export function projectProvisioningHealth(
  session: ProvisioningSession,
  now: number = Date.now()
): ProvisioningHealth {
  const expiresAt = Date.parse(session.expiresAt);
  const expired = expiresAt <= now;

  return {
    status: expired ? "expired" : session.status,
    pairingState: session.pairingState,
    activationState: session.activationState,
    expired,
    secondsRemaining: Math.max(0, Math.floor((expiresAt - now) / 1000)),
    retryCount: session.retryCount,
    rotationCount: session.rotationCount,
    warningCount: session.warnings.length,
    errorCount: session.errors.length,
  };
}
