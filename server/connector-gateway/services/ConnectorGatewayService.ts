import type {
  ConnectorHeartbeat,
  ConnectorRegistrationCommand,
  ConnectorRegistrationResult,
  GatewayCancelPrintRequest,
  GatewayCancelPrintResult,
  GatewayDiscoverPrintersRequest,
  GatewayDiscoverPrintersResult,
  GatewayExecutePrintResult,
  GatewayPrintRouteRequest,
  GatewayPrintRouteResult,
  GatewayPrinterStatusRequest,
  GatewayPrinterStatusResult,
  GatewaySelectPrinterRequest,
  GatewaySelectPrinterResult,
} from "../contracts/gatewayContracts";
import type { ConnectorExecutionPort } from "../contracts/ConnectorExecutionPort";
import type { ConnectorDirectory } from "./ConnectorDirectory";
import type { ConnectorRegistry } from "./ConnectorRegistry";
import type { ConnectorResolver, ConnectorResolveResult } from "./ConnectorResolver";
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
    const result = await this.routeExecutePrint(request);
    return {
      routed: result.routed,
      connectorInstanceId: result.connectorInstanceId,
      failureReason: result.failureReason,
      message: result.message,
    };
  }

  async routeExecutePrint(request: GatewayPrintRouteRequest): Promise<GatewayExecutePrintResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);
    const blocked = this.blockedRoute(resolved);
    if (blocked) {
      return { ...blocked, execution: null };
    }

    const execution = await this.execution.executePrint(
      resolved.session!.identity.connectorInstanceId,
      request
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session!.identity.connectorInstanceId,
        execution: execution.execution ?? null,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session!.identity.connectorInstanceId,
      execution: execution.execution ?? null,
      failureReason: null,
      message: null,
    };
  }

  async routeSelectPrinter(request: GatewaySelectPrinterRequest): Promise<GatewaySelectPrinterResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);
    const blocked = this.blockedRoute(resolved);
    if (blocked) {
      return { ...blocked, selected: null };
    }

    const execution = await this.execution.executeSelectPrinter(
      resolved.session!.identity.connectorInstanceId,
      request
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session!.identity.connectorInstanceId,
        selected: execution.selected ?? null,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session!.identity.connectorInstanceId,
      selected: execution.selected ?? null,
      failureReason: null,
      message: null,
    };
  }

  async routeCancelPrint(request: GatewayCancelPrintRequest): Promise<GatewayCancelPrintResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);
    const blocked = this.blockedRoute(resolved);
    if (blocked) {
      return { ...blocked, execution: null };
    }

    const execution = await this.execution.executeCancelPrint(
      resolved.session!.identity.connectorInstanceId,
      request
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session!.identity.connectorInstanceId,
        execution: execution.execution ?? null,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session!.identity.connectorInstanceId,
      execution: execution.execution ?? null,
      failureReason: null,
      message: null,
    };
  }

  async routeDiscoverPrinters(
    request: GatewayDiscoverPrintersRequest
  ): Promise<GatewayDiscoverPrintersResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);
    const blocked = this.blockedRoute(resolved);
    if (blocked) {
      return { ...blocked, printers: null };
    }

    const execution = await this.execution.executeDiscoverPrinters(
      resolved.session!.identity.connectorInstanceId,
      request.restaurantId
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session!.identity.connectorInstanceId,
        printers: null,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session!.identity.connectorInstanceId,
      printers: execution.printers ?? [],
      failureReason: null,
      message: null,
    };
  }

  async routeGetPrinterStatus(
    request: GatewayPrinterStatusRequest
  ): Promise<GatewayPrinterStatusResult> {
    const resolved = await this.resolver.resolve(request.restaurantId);
    const blocked = this.blockedRoute(resolved);
    if (blocked) {
      return {
        ...blocked,
        status: null,
        capabilities: null,
      };
    }

    const execution = await this.execution.executeGetPrinterStatus(
      resolved.session!.identity.connectorInstanceId,
      request.restaurantId,
      request.printerId
    );

    if (!execution.success) {
      return {
        routed: false,
        connectorInstanceId: resolved.session!.identity.connectorInstanceId,
        status: null,
        capabilities: null,
        failureReason: "transport_unavailable",
        message: execution.message ?? execution.failureReason ?? "Transport unavailable",
      };
    }

    return {
      routed: true,
      connectorInstanceId: resolved.session!.identity.connectorInstanceId,
      status: execution.status ?? null,
      capabilities: execution.capabilities ?? null,
      failureReason: null,
      message: null,
    };
  }

  private blockedRoute(resolved: ConnectorResolveResult): GatewayPrintRouteResult | null {
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

    return null;
  }
}
