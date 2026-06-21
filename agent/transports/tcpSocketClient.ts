/**
 * THERMAL-PRINTING-10B — TCP socket abstraction for network transport (injectable).
 */
export type TcpConnectOptions = {
  host: string;
  port: number;
  timeoutMs?: number;
};

export interface TcpSocketClient {
  connect(options: TcpConnectOptions): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export class MemoryTcpSocketClient implements TcpSocketClient {
  readonly connections: TcpConnectOptions[] = [];
  readonly writes: Uint8Array[] = [];
  private connected = false;

  async connect(options: TcpConnectOptions): Promise<void> {
    this.connections.push({ ...options });
    this.connected = true;
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error("TCP socket is not connected");
    }
    this.writes.push(data);
  }

  async close(): Promise<void> {
    this.connected = false;
  }
}
