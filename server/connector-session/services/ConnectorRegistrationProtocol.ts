import type { ConnectorGatewayService } from "../../connector-gateway/services/ConnectorGatewayService";
import type {
  ConnectorRegisterRequest,
  ConnectorRegisterResult,
  LiveConnectorSession,
} from "../contracts/sessionContracts";
import type { ConnectorSessionManager } from "./ConnectorSessionManager";

/**
 * Registration protocol — persists connector metadata in gateway registry.
 */
export class ConnectorRegistrationProtocol {
  constructor(
    private readonly gateway: ConnectorGatewayService,
    private readonly sessionManager: ConnectorSessionManager
  ) {}

  async register(request: ConnectorRegisterRequest, session: LiveConnectorSession): Promise<ConnectorRegisterResult> {
    if (session.sessionId !== request.sessionId) {
      return {
        success: false,
        failureCode: "registration_failure",
        message: "Session mismatch",
      };
    }

    if (session.identity.restaurantId !== request.restaurantId) {
      return {
        success: false,
        failureCode: "registration_failure",
        message: "Restaurant mismatch",
      };
    }

    try {
      await this.gateway.register({
        restaurantId: request.restaurantId,
        connectorInstanceId: request.connectorId,
        deploymentTarget: request.deploymentType,
        metadata: {
          label: request.hostLabel,
          version: request.version,
          hostFingerprint: request.hostFingerprint,
        },
        capabilities: request.capabilities,
        endpoint: {
          hostLabel: request.hostLabel,
          processPlatform: request.platform,
        },
      });
    } catch {
      return {
        success: false,
        failureCode: "registration_failure",
        message: "Gateway registration failed",
      };
    }

    const { session: registered } = await this.sessionManager.registerSession(
      {
        ...session,
        identity: {
          connectorId: request.connectorId,
          restaurantId: request.restaurantId,
          runtimeId: request.runtimeId,
          platform: request.platform,
          version: request.version,
          deploymentType: request.deploymentType,
          capabilities: request.capabilities,
          hostFingerprint: request.hostFingerprint,
        },
      },
      request.connectorId
    );

    await this.sessionManager.markHealthy(registered.sessionId, new Date().toISOString());

    return { success: true, failureCode: null, message: null };
  }
}
