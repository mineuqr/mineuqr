/**
 * THERMAL-PRINTING-10B — production TCP socket client (Node.js net).
 */
import net from "node:net";
import type { TcpConnectOptions, TcpSocketClient } from "./tcpSocketClient";

export class NodeTcpSocketClient implements TcpSocketClient {
  private socket: net.Socket | null = null;

  async connect(options: TcpConnectOptions): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({
        host: options.host,
        port: options.port,
      });

      const timeoutMs = options.timeoutMs ?? 5_000;
      const timeoutHandle = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP connection timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      socket.once("connect", () => {
        clearTimeout(timeoutHandle);
        this.socket = socket;
        resolve();
      });

      socket.once("error", (error) => {
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.socket) {
      throw new Error("TCP socket is not connected");
    }

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(data, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.socket) {
      return;
    }
    this.socket.destroy();
    this.socket = null;
  }
}
