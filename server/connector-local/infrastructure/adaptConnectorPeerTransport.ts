import type { ConnectorPeerTransport } from "../contracts/GatewayTransportPort";
import type {
  TransportInboundMessage,
  TransportOutboundMessage,
} from "../../connector-session/contracts/ConnectorTransportPort";

type MinimalPeer = {
  connectionId: string;
  sendInbound(message: TransportInboundMessage): Promise<void>;
  onOutbound(handler: (message: TransportOutboundMessage) => void): void;
  close(): Promise<void>;
  onDisconnect?: (handler: () => void) => void;
};

/**
 * Adapts session test transports to RLC ConnectorPeerTransport contract.
 */
export function adaptConnectorPeerTransport(peer: MinimalPeer): ConnectorPeerTransport {
  if (peer.onDisconnect) {
    return peer as ConnectorPeerTransport;
  }

  const disconnectHandlers = new Set<() => void>();

  return {
    connectionId: peer.connectionId,
    sendInbound: (message) => peer.sendInbound(message),
    onOutbound: (handler) => peer.onOutbound(handler),
    onDisconnect: (handler) => {
      disconnectHandlers.add(handler);
    },
    close: async () => {
      await peer.close();
      for (const handler of Array.from(disconnectHandlers)) {
        handler();
      }
    },
  };
}
