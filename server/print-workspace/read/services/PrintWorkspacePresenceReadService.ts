import type { ConnectorDirectory } from "../../../connector-gateway/services/ConnectorDirectory";
import type { ConnectorSession } from "../../../connector-gateway/contracts/gatewayContracts";
import type { PrinterManagementService } from "../../../printer-management/services/PrinterManagementService";
import type {
  ConnectorSessionStatusDto,
  LocalConnectorHealthLabel,
  LocalConnectorStatusDto,
  WorkspaceDiagnosticsCardDto,
  WorkspaceDiagnosticsSummaryDto,
  WorkspaceHealthState,
  WorkspaceTechnicalReportDto,
} from "../contracts/printWorkspacePresenceContracts";

function mapAvailability(
  availability: string,
  isRegistered: boolean
): WorkspaceHealthState {
  if (!isRegistered) return "unregistered";
  switch (availability) {
    case "online":
      return "connected";
    case "degraded":
      return "degraded";
    case "offline":
      return "offline";
    case "unregistered":
      return "unregistered";
    default:
      return "disconnected";
  }
}

function toHealthLabel(state: WorkspaceHealthState): LocalConnectorHealthLabel {
  switch (state) {
    case "healthy":
    case "connected":
      return "Healthy";
    case "degraded":
    case "warning":
      return "Degraded";
    case "unregistered":
      return "Unregistered";
    default:
      return "Offline";
  }
}

function transportLabel(deploymentTarget: string): string {
  const targets: Record<string, string> = {
    local_desktop: "Local Desktop",
    android: "Android",
    edge: "Edge",
    embedded: "Embedded",
  };
  const label = targets[deploymentTarget] ?? deploymentTarget;
  return `Connector Session · ${label}`;
}

function emptyLocalConnector(): LocalConnectorStatusDto {
  return {
    connectionStatus: "unregistered",
    healthLabel: "Unregistered",
    connectorVersion: null,
    runtimePlatform: null,
    runtimeUptimeMs: null,
    lastHeartbeatAt: null,
    connectorId: null,
    hostLabel: null,
  };
}

function emptySession(): ConnectorSessionStatusDto {
  return {
    sessionState: "unregistered",
    authentication: "Not connected",
    registration: "Not registered",
    transport: "Connector Session",
    connectedSince: null,
    lastActivityAt: null,
  };
}

/**
 * PRINT-UX-2 read projection — Connector Gateway directory → operator DTOs.
 */
export class PrintWorkspacePresenceReadService {
  constructor(
    private readonly directory: ConnectorDirectory,
    private readonly printerManagement: PrinterManagementService,
    private readonly now: () => number = () => Date.now()
  ) {}

  async getLocalConnectorStatus(restaurantId: number): Promise<LocalConnectorStatusDto> {
    const session = await this.findSession(restaurantId);
    const health = await this.directory.getHealthForRestaurant(restaurantId);
    if (!health || !session) {
      return emptyLocalConnector();
    }

    const connectionStatus = mapAvailability(
      health.status.availability,
      health.status.isRegistered
    );

    return {
      connectionStatus,
      healthLabel: toHealthLabel(connectionStatus),
      connectorVersion: session.metadata.version,
      runtimePlatform: session.runtime.endpoint.processPlatform,
      runtimeUptimeMs: this.now() - Date.parse(session.runtime.registeredAt),
      lastHeartbeatAt: session.runtime.lastHeartbeatAt ?? health.status.lastSeenAt,
      connectorId: session.identity.connectorInstanceId,
      hostLabel: session.runtime.endpoint.hostLabel,
    };
  }

  async getConnectorSessionStatus(restaurantId: number): Promise<ConnectorSessionStatusDto> {
    const session = await this.findSession(restaurantId);
    const health = await this.directory.getHealthForRestaurant(restaurantId);
    if (!session || !health) {
      return emptySession();
    }

    const sessionState = mapAvailability(
      health.status.availability,
      health.status.isRegistered
    );

    return {
      sessionState,
      authentication: health.status.isRegistered ? "Authenticated" : "Not connected",
      registration: health.status.isRegistered ? "Registered" : "Not registered",
      transport: transportLabel(session.identity.deploymentTarget),
      connectedSince: session.runtime.registeredAt,
      lastActivityAt: session.runtime.lastHeartbeatAt ?? health.status.lastSeenAt,
    };
  }

  async getDiagnosticsSummary(restaurantId: number): Promise<WorkspaceDiagnosticsSummaryDto> {
    const evaluatedAt = new Date(this.now()).toISOString();
    const [connector, session, printer] = await Promise.all([
      this.getLocalConnectorStatus(restaurantId),
      this.getConnectorSessionStatus(restaurantId),
      this.printerManagement.getCurrentPrinter(restaurantId),
    ]);

    const cards: WorkspaceDiagnosticsCardDto[] = [
      {
        id: "connector",
        title: "Restaurant Local Connector",
        status: connector.connectionStatus,
        detail: connector.connectorId
          ? `${connector.healthLabel} · ${connector.hostLabel ?? "on-premise host"}`
          : "No connector registered for this restaurant",
      },
      {
        id: "session",
        title: "Connector Session",
        status: session.sessionState,
        detail: session.registration === "Registered"
          ? `${session.transport} · last activity ${session.lastActivityAt ?? "—"}`
          : "Session not established",
      },
      {
        id: "printer",
        title: "Current Printer",
        status: printer.configured
          ? printer.status?.isReady
            ? "healthy"
            : printer.status?.isOnline
              ? "warning"
              : "offline"
          : "warning",
        detail: printer.configured
          ? `${printer.printer!.displayName} · ${printer.status?.isReady ? "Ready" : "Not ready"}`
          : "No printer configured",
      },
    ];

    return { cards, evaluatedAt };
  }

  async getTechnicalReport(restaurantId: number): Promise<WorkspaceTechnicalReportDto> {
    const evaluatedAt = new Date(this.now()).toISOString();
    const session = await this.findSession(restaurantId);
    const health = await this.directory.getHealthForRestaurant(restaurantId);
    const currentPrinter = await this.printerManagement.getCurrentPrinter(restaurantId);

    let printerReport: Record<string, unknown> | null = null;
    if (currentPrinter.printer) {
      const diagnostics = await this.printerManagement.getDiagnostics(
        restaurantId,
        currentPrinter.printer.printerId
      );
      printerReport = diagnostics
        ? (structuredClone(diagnostics) as Record<string, unknown>)
        : {
            configured: currentPrinter.configured,
            printer: currentPrinter.printer,
            status: currentPrinter.status,
          };
    }

    return {
      evaluatedAt,
      restaurantId,
      connector: health
        ? (structuredClone(health) as Record<string, unknown>)
        : null,
      session: session ? (structuredClone(session) as Record<string, unknown>) : null,
      printer: printerReport,
    };
  }

  private async findSession(restaurantId: number): Promise<ConnectorSession | null> {
    const sessions = await this.directory.listSessions();
    return sessions.find((s) => s.identity.restaurantId === restaurantId) ?? null;
  }
}
