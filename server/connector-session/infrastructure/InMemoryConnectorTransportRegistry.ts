import type {
  ConnectorTransportConnection,
  ConnectorTransportRegistry,
} from "../contracts/ConnectorTransportPort";

export class InMemoryConnectorTransportRegistry implements ConnectorTransportRegistry {
  private readonly byInstance = new Map<string, ConnectorTransportConnection>();
  private readonly byConnection = new Map<string, ConnectorTransportConnection>();

  track(connection: ConnectorTransportConnection): void {
    this.byConnection.set(connection.connectionId, connection);
  }

  bind(connectorInstanceId: string, connection: ConnectorTransportConnection): void {
    this.byInstance.set(connectorInstanceId, connection);
    this.byConnection.set(connection.connectionId, connection);
  }

  getByInstance(connectorInstanceId: string): ConnectorTransportConnection | null {
    return this.byInstance.get(connectorInstanceId) ?? null;
  }

  getByConnection(connectionId: string): ConnectorTransportConnection | null {
    return this.byConnection.get(connectionId) ?? null;
  }

  unbind(connectionId: string): void {
    const connection = this.byConnection.get(connectionId);
    if (!connection) return;
    this.byConnection.delete(connectionId);
    for (const [instanceId, bound] of Array.from(this.byInstance.entries())) {
      if (bound.connectionId === connectionId) {
        this.byInstance.delete(instanceId);
      }
    }
  }
}
