import type { GatewayTransportFactory } from "../contracts/GatewayTransportPort";
import type { ConnectorPeerTransport } from "../contracts/GatewayTransportPort";

/**
 * Opens outbound gateway connection (RLC-initiated per ADR-ARCH-016).
 */
export class GatewayConnectionClient {
  private transport: ConnectorPeerTransport | null = null;

  constructor(private readonly transportFactory: GatewayTransportFactory) {}

  async open(): Promise<ConnectorPeerTransport> {
    this.transport = await this.transportFactory.connect();
    return this.transport;
  }

  getTransport(): ConnectorPeerTransport | null {
    return this.transport;
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }
}
