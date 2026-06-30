import type { LocalConnectorDiagnosticsSnapshot } from "../contracts/localContracts";
import type { LocalConnectorHost } from "./LocalConnectorHost";

export class LocalConnectorDiagnostics {
  snapshot(host: LocalConnectorHost): LocalConnectorDiagnosticsSnapshot {
    const identity = host.getIdentity();
    const config = host.getConfig();
    const health = host.evaluateHealth();
    const session = host.getSession();

    if (!identity || !config) {
      throw new Error("connector_not_initialized");
    }

    return {
      identity,
      configuration: {
        cloudEndpoint: config.cloudEndpoint,
        heartbeatIntervalMs: config.heartbeatIntervalMs,
        deploymentType: config.deploymentType,
      },
      gatewayConnection: {
        connected: health.gatewayConnectivity === "connected",
        connectionId: session.connectionId,
      },
      session,
      health,
      deployment: {
        deploymentType: config.deploymentType,
        platform: config.platform,
        architecture: config.architecture,
      },
    };
  }
}
