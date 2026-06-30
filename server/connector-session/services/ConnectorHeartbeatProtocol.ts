import type { ConnectorGatewayService } from "../../connector-gateway/services/ConnectorGatewayService";
import type {
  ConnectorHeartbeatRequest,
  ConnectorHeartbeatResult,
} from "../contracts/sessionContracts";
import type { ConnectorSessionManager } from "./ConnectorSessionManager";
import { MIN_CONNECTOR_VERSION } from "./ConnectorAuthenticationService";

/**
 * Heartbeat protocol — infrastructure liveness only, no business logic.
 */
export class ConnectorHeartbeatProtocol {
  constructor(
    private readonly gateway: ConnectorGatewayService,
    private readonly sessionManager: ConnectorSessionManager
  ) {}

  async heartbeat(request: ConnectorHeartbeatRequest): Promise<ConnectorHeartbeatResult> {
    const session = await this.sessionManager.getByConnectorId(request.connectorId);
    if (!session || session.sessionId !== request.sessionId) {
      return {
        success: false,
        lifecycle: null,
        failureCode: "session_expired",
        message: "Session not found",
      };
    }

    if (session.identity.restaurantId !== request.restaurantId) {
      return {
        success: false,
        lifecycle: null,
        failureCode: "authentication_failure",
        message: "Tenant mismatch",
      };
    }

    if (!isVersionCompatible(request.version, MIN_CONNECTOR_VERSION)) {
      return {
        success: false,
        lifecycle: null,
        failureCode: "version_mismatch",
        message: "Connector version is not supported",
      };
    }

    const updated = await this.gateway.heartbeat({
      restaurantId: request.restaurantId,
      connectorInstanceId: request.connectorId,
      receivedAt: request.receivedAt,
    });

    if (!updated) {
      return {
        success: false,
        lifecycle: "degraded",
        failureCode: "connector_unavailable",
        message: "Gateway heartbeat rejected",
      };
    }

    const healthy = await this.sessionManager.markHealthy(session.sessionId, request.receivedAt);

    return {
      success: true,
      lifecycle: healthy?.lifecycle ?? "healthy",
      failureCode: null,
      message: null,
    };
  }
}

function isVersionCompatible(version: string, minimum: string): boolean {
  const parse = (value: string) => value.split(".").map((part) => Number(part) || 0);
  const current = parse(version);
  const min = parse(minimum);
  for (let index = 0; index < 3; index += 1) {
    if ((current[index] ?? 0) < (min[index] ?? 0)) return false;
    if ((current[index] ?? 0) > (min[index] ?? 0)) return true;
  }
  return true;
}
