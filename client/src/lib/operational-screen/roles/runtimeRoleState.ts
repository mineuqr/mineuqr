import type { BootstrapPhase } from "../runtimeTypes";
import type { RoleRuntimeStatus } from "./runtimeRoleContract";

/** Maps platform bootstrap phase to the formal role runtime state model. */
export function mapBootstrapPhaseToRoleRuntimeStatus(
  bootstrapPhase: BootstrapPhase,
  operational: boolean
): RoleRuntimeStatus {
  switch (bootstrapPhase) {
    case "loading":
      return "initializing";
    case "validating":
      return "authenticating";
    case "context_ready":
    case "heartbeat_active":
      return "bootstrapping";
    case "running":
      return operational ? "operational" : "ready";
    case "blocked":
      return "blocked";
    case "degraded":
      return "disconnected";
    case "revoked":
    case "pairing_redirect":
      return "disposed";
    default:
      return "initializing";
  }
}

/** When platform is degraded but recovering, roles report reconnecting before operational. */
export function resolveRoleRuntimeStatus(
  bootstrapPhase: BootstrapPhase,
  operational: boolean,
  reconnecting: boolean
): RoleRuntimeStatus {
  if (reconnecting && bootstrapPhase !== "degraded" && bootstrapPhase !== "revoked") {
    return "reconnecting";
  }
  return mapBootstrapPhaseToRoleRuntimeStatus(bootstrapPhase, operational);
}
