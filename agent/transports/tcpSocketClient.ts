/**
 * THERMAL-PRINTING-10C — TCP socket abstraction.
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

export interface TcpSocketClientFactory {
  create(): TcpSocketClient;
}

export class MemoryTcpSocketClient implements TcpSocketClient {
  readonly connections: TcpConnectOptions[] = [];
  readonly writes: Uint8Array[] = [];
  private connected = false;
  private failConnect = false;
  private failWrite = false;

  failOnConnect(message = "Connection failed"): void {
    this.failConnect = true;
    this.failConnectMessage = message;
  }

  failOnWrite(message = "Write failed"): void {
    this.failWrite = true;
    this.failWriteMessage = message;
  }

  private failConnectMessage = "Connection failed";
  private failWriteMessage = "Write failed";

  async connect(options: TcpConnectOptions): Promise<void> {
    if (this.failConnect) {
      throw new Error(this.failConnectMessage);
    }
    this.connections.push({ ...options });
    this.connected = true;
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error("TCP socket is not connected");
    }
    if (this.failWrite) {
      throw new Error(this.failWriteMessage);
    }
    this.writes.push(data);
  }

  async close(): Promise<void> {
    this.connected = false;
  }
}

export class MemoryTcpSocketClientFactory implements TcpSocketClientFactory {
  readonly clients: MemoryTcpSocketClient[] = [];

  create(): TcpSocketClient {
    const client = new MemoryTcpSocketClient();
    this.clients.push(client);
    return client;
  }
}
