/**
 * THERMAL-PRINTING-10B — transport adapter registry.
 */
import { EXECUTION_TRANSPORTS, type ExecutionTransport } from "../executionCapabilities";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
  TransportRegistry,
} from "./transportContracts";

class NotImplementedTransportAdapter implements ExecutionTransportAdapter {
  readonly transport: ExecutionTransport;

  constructor(transport: ExecutionTransport) {
    this.transport = transport;
  }

  async deliver(_request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    return {
      status: "not-implemented",
      transport: this.transport,
      message: `Transport adapter not implemented: ${this.transport}`,
    };
  }
}

export function createTransportRegistry(
  adapters: readonly ExecutionTransportAdapter[]
): TransportRegistry {
  const byTransport = new Map<ExecutionTransport, ExecutionTransportAdapter>();
  for (const adapter of adapters) {
    byTransport.set(adapter.transport, adapter);
  }

  const supported = adapters.map((adapter) => adapter.transport);
  const notImplemented = EXECUTION_TRANSPORTS.filter(
    (transport) => !byTransport.has(transport)
  );

  return {
    get(transport: ExecutionTransport): ExecutionTransportAdapter | undefined {
      const adapter = byTransport.get(transport);
      if (adapter) {
        return adapter;
      }
      if (notImplemented.includes(transport)) {
        return new NotImplementedTransportAdapter(transport);
      }
      return undefined;
    },
    listSupported(): ExecutionTransport[] {
      return [...supported];
    },
    listNotImplemented(): ExecutionTransport[] {
      return [...notImplemented];
    },
  };
}
