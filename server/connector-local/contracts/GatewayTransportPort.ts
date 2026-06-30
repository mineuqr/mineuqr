import type {
  TransportInboundMessage,
  TransportOutboundMessage,
} from "../../connector-session/contracts/ConnectorTransportPort";

/**
 * RLC-side duplex transport — outbound-initiated session to cloud gateway.
 */
export interface ConnectorPeerTransport {
  readonly connectionId: string;
  sendInbound(message: TransportInboundMessage): Promise<void>;
  onOutbound(handler: (message: TransportOutboundMessage) => void): void;
  onDisconnect(handler: () => void): void;
  close(): Promise<void>;
}

export interface GatewayTransportFactory {
  connect(): Promise<ConnectorPeerTransport>;
}
