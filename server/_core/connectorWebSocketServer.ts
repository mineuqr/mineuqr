import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { WebSocketServer } from "ws";
import { connectorNetworkComposition } from "../connector-session/networkComposition";
import type {
  TransportInboundMessage,
  TransportOutboundMessage,
} from "../connector-session/contracts/ConnectorTransportPort";

function isInbound(
  message: TransportInboundMessage | TransportOutboundMessage
): message is TransportInboundMessage {
  return (
    message.type === "auth" ||
    message.type === "register" ||
    message.type === "heartbeat" ||
    message.type === "response"
  );
}

export function attachConnectorWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/connector/ws" });

  wss.on("connection", (socket) => {
    const connectionId = randomUUID();
    let closed = false;

    const connection = {
      connectionId,
      send: async (message: TransportOutboundMessage) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify(message));
        }
      },
      onMessage: (handler: (message: TransportInboundMessage) => void) => {
        socket.on("message", (data) => {
          try {
            const message = JSON.parse(String(data)) as
              | TransportInboundMessage
              | TransportOutboundMessage;
            if (isInbound(message)) {
              handler(message);
            }
          } catch {
            // ignore malformed payloads
          }
        });
      },
      onDisconnect: (handler: () => void) => {
        socket.on("close", handler);
      },
      close: async () => {
        if (!closed) {
          closed = true;
          socket.close();
        }
      },
    };

    connectorNetworkComposition.session.acceptConnection(connection);
  });
}
