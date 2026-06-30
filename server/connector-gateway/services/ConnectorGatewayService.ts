import type {
  ConnectorHeartbeat,
  ConnectorRegistrationCommand,
  ConnectorRegistrationResult,
  GatewayPrintRouteRequest,
  GatewayPrintRouteResult,
} from "../contracts/gatewayContracts";
import type { ConnectorExecutionPort } from "../contracts/ConnectorExecutionPort";
import type { ConnectorDirectory } from "./ConnectorDirectory";
import type { ConnectorRegistry } from "./ConnectorRegistry";
import type { ConnectorResolver } from "./ConnectorResolver";
import type { ConnectorHealthService } from "./ConnectorHealthService";

/**
 * Cloud entry point for Restaurant Local Connector routing (ADR-ARCH-016).
 * Does not execute OS print I/O — delegates to ConnectorExecutionPort (future network layer).
 */
export class ConnectorGatewayService {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly resolver: ConnectorResolver,
    private readonly health: ConnectorHealthService,
    private readonly directory: ConnectorDirectory,
    private readonly execution: ConnectorExecutionPort
  ) {}

  register(command: ConnectorRegistrationCommand): Promise<ConnectorRegistrationResult> {
    return this.registry.register(command);
  }

  heartbeat(heartbeat: ConnectorHeartbeat) {
    return this.health.recordHeartbeat(heartbeat);
  }

  getDirectory(): ConnectorDirectory {
    return this.directory;
  }

  async routePrint(request: GatewayPrintRouteRequest): Promise<GatewayPrintRouteResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);

    if (!resolved.session) {
      return {
        routed: false,
        connectorInstanceId: null,
        failureReason:
          resolved.reason === "unregistered" ? "connector_unregistered" : "connector_offline",
        message:
          resolved.reason === "unregistered"
            ? "No connector registered for restaurant"
            : "Connector is not available",
      };
    }

    if (resolved.reason === "offline") {
      return {
        routed: false,
        connectorInstanceId: resolved.session.identity.connectorInstanceId,
        failureReason: "connector_offline",
        message: "Connector is offline",
      };
    }

    const execution = await this.execution.executePrint(
      resolved.session.identity.connectorInstanceId,
      request
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session.identity.connectorInstanceId,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session.identity.connectorInstanceId,
      failureReason: null,
      message: null,
    };
  }
}
