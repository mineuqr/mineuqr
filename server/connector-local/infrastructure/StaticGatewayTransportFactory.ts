import type { ConnectorPeerTransport } from "../contracts/GatewayTransportPort";

/**
 * Wraps a pre-connected peer transport for tests and in-process wiring.
 */
export class StaticGatewayTransportFactory {
  constructor(private readonly transport: ConnectorPeerTransport) {}

  async connect(): Promise<ConnectorPeerTransport> {
    return this.transport;
  }
}
