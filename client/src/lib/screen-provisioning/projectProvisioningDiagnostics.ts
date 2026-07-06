import type {
  ProvisioningDiagnostics,
  ProvisioningObservability,
  ProvisioningSession,
} from "./provisioningSessionContract";
import { projectProvisioningHealth } from "./projectProvisioningHealth";

export function projectProvisioningDiagnostics(
  session: ProvisioningSession,
  observability: ProvisioningObservability
): ProvisioningDiagnostics {
  return {
    session,
    health: projectProvisioningHealth(session),
    observability,
    pairingTimeline: [{ at: session.startedAt, state: session.pairingState }],
    activationTimeline: [{ at: session.updatedAt, state: session.activationState }],
  };
}
