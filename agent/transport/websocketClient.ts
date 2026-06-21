/**
 * THERMAL-PRINTING-6D — WebSocket client abstraction (testable, platform-neutral).
 */
import WebSocket from "ws";

export type WebSocketClientHandlers = {
  onOpen?: () => void;
  onMessage?: (data: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
};

export interface AgentWebSocketClient {
  connect(url: string): Promise<void>;
  send(data: string): void;
  close(): void;
  isOpen(): boolean;
  setHandlers(handlers: WebSocketClientHandlers): void;
}

export class WsAgentWebSocketClient implements AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: WebSocketClientHandlers = {};

  setHandlers(handlers: WebSocketClientHandlers): void {
    this.handlers = handlers;
  }

  async connect(url: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);

      ws.once("open", () => {
        this.ws = ws;
        this.handlers.onOpen?.();
        resolve();
      });

      ws.once("error", (error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.handlers.onError?.(normalized);
        reject(normalized);
      });

      ws.on("message", (data, isBinary) => {
        if (isBinary) {
          return;
        }
        this.handlers.onMessage?.(data.toString());
      });

      ws.on("close", () => {
        this.handlers.onClose?.();
        if (this.ws === ws) {
          this.ws = null;
        }
      });

      ws.on("error", (error) => {
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.handlers.onError?.(normalized);
      });
    });
  }

  send(data: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.ws.send(data);
  }

  close(): void {
    if (!this.ws) {
      return;
    }

    this.ws.close();
    this.ws = null;
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export class MockAgentWebSocketClient implements AgentWebSocketClient {
  readonly sent: string[] = [];
  private open = false;
  private handlers: WebSocketClientHandlers = {};

  setHandlers(handlers: WebSocketClientHandlers): void {
    this.handlers = handlers;
  }

  async connect(_url: string): Promise<void> {
    this.open = true;
    this.handlers.onOpen?.();
  }

  send(data: string): void {
    if (!this.open) {
      throw new Error("WebSocket is not connected");
    }
    this.sent.push(data);
  }

  close(): void {
    if (!this.open) {
      return;
    }
    this.open = false;
    this.handlers.onClose?.();
  }

  isOpen(): boolean {
    return this.open;
  }

  simulateDisconnect(): void {
    this.open = false;
    this.handlers.onClose?.();
  }
}
