import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import type {
  TransportInboundMessage,
  TransportOutboundMessage,
} from "../../connector-session/contracts/ConnectorTransportPort";
import type { ConnectorPeerTransport, GatewayTransportFactory } from "../contracts/GatewayTransportPort";

function isInbound(message: TransportInboundMessage | TransportOutboundMessage): message is TransportInboundMessage {
  return (
    message.type === "auth" ||
    message.type === "register" ||
    message.type === "heartbeat" ||
    message.type === "response"
  );
}

export class WebSocketGatewayTransportFactory implements GatewayTransportFactory {
  constructor(private readonly endpoint: string) {}

  async connect(): Promise<ConnectorPeerTransport> {
    const connectionId = randomUUID();
    const socket = new WebSocket(this.endpoint);

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off("open", onOpen);
        socket.off("error", onError);
      };
      socket.once("open", onOpen);
      socket.once("error", onError);
    });

    const outboundHandlers = new Set<(message: TransportOutboundMessage) => void>();
    const disconnectHandlers = new Set<() => void>();

    socket.on("message", (data) => {
      try {
        const message = JSON.parse(String(data)) as TransportInboundMessage | TransportOutboundMessage;
        if (!isInbound(message)) {
          for (const handler of Array.from(outboundHandlers)) {
            handler(message);
          }
        }
      } catch {
        // ignore malformed wire messages
      }
    });

    socket.on("close", () => {
      for (const handler of Array.from(disconnectHandlers)) {
        handler();
      }
    });

    return {
      connectionId,
      sendInbound: async (message) => {
        if (socket.readyState !== WebSocket.OPEN) {
          throw new Error("transport_not_connected");
        }
        socket.send(JSON.stringify(message));
      },
      onOutbound: (handler) => {
        outboundHandlers.add(handler);
      },
      onDisconnect: (handler) => {
        disconnectHandlers.add(handler);
      },
      close: async () => {
        socket.close();
      },
    };
  }
}
