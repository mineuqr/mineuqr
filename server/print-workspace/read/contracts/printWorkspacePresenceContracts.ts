/**
 * PRINT-UX-2 — operator-facing read projections for distributed printing infrastructure.
 * Maps Connector Gateway directory state to presentation DTOs (no gateway mutation).
 */

export type WorkspaceHealthState =
  | "healthy"
  | "connected"
  | "warning"
  | "disconnected"
  | "offline"
  | "degraded"
  | "unregistered";

export type LocalConnectorHealthLabel = "Healthy" | "Degraded" | "Offline" | "Unregistered";

export type LocalConnectorStatusDto = {
  connectionStatus: WorkspaceHealthState;
  healthLabel: LocalConnectorHealthLabel;
  connectorVersion: string | null;
  runtimePlatform: string | null;
  runtimeUptimeMs: number | null;
  lastHeartbeatAt: string | null;
  connectorId: string | null;
  hostLabel: string | null;
};

export type ConnectorSessionStatusDto = {
  sessionState: WorkspaceHealthState;
  authentication: "Authenticated" | "Not connected";
  registration: "Registered" | "Not registered";
  transport: string;
  connectedSince: string | null;
  lastActivityAt: string | null;
};

export type WorkspaceDiagnosticsCardDto = {
  id: string;
  title: string;
  status: WorkspaceHealthState;
  detail: string;
};

export type WorkspaceDiagnosticsSummaryDto = {
  cards: WorkspaceDiagnosticsCardDto[];
  evaluatedAt: string;
};

export type WorkspaceTechnicalReportDto = {
  evaluatedAt: string;
  restaurantId: number;
  connector: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
  printer: Record<string, unknown> | null;
};
