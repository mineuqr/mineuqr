import type {
  ConnectorTransportConnection,
  TransportInboundMessage,
  TransportOutboundMessage,
} from "../contracts/ConnectorTransportPort";

type AnyMessage = TransportInboundMessage | TransportOutboundMessage;

export type ConnectorPeerTransport = {
  connectionId: string;
  sendInbound(message: TransportInboundMessage): Promise<void>;
  onOutbound(handler: (message: TransportOutboundMessage) => void): void;
  close(): Promise<void>;
};

class InProcessPeer {
  readonly connectionId: string;
  private readonly messageHandlers = new Set<(message: AnyMessage) => void>();
  private readonly disconnectHandlers = new Set<() => void>();
  private peer: InProcessPeer | null = null;

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  link(other: InProcessPeer): void {
    this.peer = other;
    other.peer = this;
  }

  onMessage(handler: (message: AnyMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  onDisconnect(handler: () => void): void {
    this.disconnectHandlers.add(handler);
  }

  async deliverToPeer(message: AnyMessage): Promise<void> {
    if (!this.peer) return;
    await this.peer.deliver(message);
  }

  async deliver(message: AnyMessage): Promise<void> {
    for (const handler of Array.from(this.messageHandlers)) {
      handler(message);
    }
  }

  async close(): Promise<void> {
    for (const handler of Array.from(this.disconnectHandlers)) {
      handler();
    }
    if (this.peer) {
      for (const handler of Array.from(this.peer.disconnectHandlers)) {
        handler();
      }
    }
  }
}

function toCloudConnection(peer: InProcessPeer): ConnectorTransportConnection {
  return {
    connectionId: peer.connectionId,
    send: async (message) => peer.deliverToPeer(message),
    onMessage: (handler) => {
      peer.onMessage((message) => {
        if (isInbound(message)) handler(message);
      });
    },
    onDisconnect: (handler) => peer.onDisconnect(handler),
    close: () => peer.close(),
  };
}

function toConnectorPeer(peer: InProcessPeer): ConnectorPeerTransport {
  return {
    connectionId: peer.connectionId,
    sendInbound: async (message) => peer.deliverToPeer(message),
    onOutbound: (handler) => {
      peer.onMessage((message) => {
        if (!isInbound(message)) handler(message);
      });
    },
    close: () => peer.close(),
  };
}

function isInbound(message: AnyMessage): message is TransportInboundMessage {
  return (
    message.type === "auth" ||
    message.type === "register" ||
    message.type === "heartbeat" ||
    message.type === "response"
  );
}

/**
 * In-process duplex transport for protocol tests without WebSocket/gRPC.
 */
export function createInProcessTransportPair(): {
  cloud: ConnectorTransportConnection;
  connector: ConnectorPeerTransport;
} {
  const cloudPeer = new InProcessPeer(`cloud-${Math.random().toString(36).slice(2)}`);
  const connectorPeer = new InProcessPeer(`connector-${Math.random().toString(36).slice(2)}`);
  cloudPeer.link(connectorPeer);

  return {
    cloud: toCloudConnection(cloudPeer),
    connector: toConnectorPeer(connectorPeer),
  };
}
