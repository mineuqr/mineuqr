import type {
  ConnectorAuthRequest,
  ConnectorAuthResult,
  ConnectorCommandEnvelope,
  ConnectorCommandResponse,
  ConnectorHeartbeatRequest,
  ConnectorHeartbeatResult,
  ConnectorRegisterRequest,
  ConnectorRegisterResult,
} from "./sessionContracts";

export type TransportInboundMessage =
  | { type: "auth"; payload: ConnectorAuthRequest }
  | { type: "register"; payload: ConnectorRegisterRequest }
  | { type: "heartbeat"; payload: ConnectorHeartbeatRequest }
  | { type: "response"; payload: ConnectorCommandResponse };

export type TransportOutboundMessage =
  | { type: "auth_result"; payload: ConnectorAuthResult }
  | { type: "register_result"; payload: ConnectorRegisterResult }
  | { type: "heartbeat_result"; payload: ConnectorHeartbeatResult }
  | { type: "command"; payload: ConnectorCommandEnvelope };

/**
 * Replaceable transport seam — concrete wire protocols implement this port.
 * Business layers never depend on concrete transport.
 */
export interface ConnectorTransportConnection {
  readonly connectionId: string;
  send(message: TransportOutboundMessage): Promise<void>;
  onMessage(handler: (message: TransportInboundMessage) => void): void;
  onDisconnect(handler: () => void): void;
  close(): Promise<void>;
}

export interface ConnectorTransportRegistry {
  track(connection: ConnectorTransportConnection): void;
  bind(connectorInstanceId: string, connection: ConnectorTransportConnection): void;
  getByInstance(connectorInstanceId: string): ConnectorTransportConnection | null;
  getByConnection(connectionId: string): ConnectorTransportConnection | null;
  unbind(connectionId: string): void;
}
