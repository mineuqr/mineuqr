import type { PrintPayload } from "../../printing/domain/PrintPayload";
import { PRINT_PAYLOAD_SCHEMA_VERSION } from "../../printing/domain/PrintPayload";
import type {
  ConnectorCapability,
  ConnectorEndpoint,
  ConnectorMetadata,
  ConnectorRegistrationCommand,
} from "../contracts/gatewayContracts";

export function samplePayload(restaurantId = 1, orderId = 100): PrintPayload {
  return {
    schemaVersion: PRINT_PAYLOAD_SCHEMA_VERSION,
    restaurantId,
    orderId,
    orderNumber: "ORD-100",
    orderStatus: "confirmed",
    tableNumber: 5,
    totalAmount: "25.00",
    createdAt: "2026-06-26T12:00:00.000Z",
    lineItems: [],
    requestedAt: "2026-06-26T12:00:00.000Z",
    trigger: { source: "order_event", eventType: "OrderConfirmed" },
  };
}

export function sampleRegistration(
  overrides: Partial<ConnectorRegistrationCommand> = {}
): ConnectorRegistrationCommand {
  const metadata: ConnectorMetadata = {
    label: "Kitchen RLC",
    version: "1.0.0",
    hostFingerprint: "fp-abc",
  };
  const capabilities: ConnectorCapability = {
    supportsLocalDiscovery: true,
    supportsRemoteExecution: true,
    supportsBackgroundExecution: true,
    supportsInProcessExecution: false,
  };
  const endpoint: ConnectorEndpoint = {
    hostLabel: "kitchen-pc",
    processPlatform: "windows",
  };

  return {
    restaurantId: 1,
    connectorInstanceId: "rlc-instance-1",
    deploymentTarget: "local_desktop",
    metadata,
    capabilities,
    endpoint,
    ...overrides,
  };
}
