/**
 * THERMAL-PRINTING-12E.2A — endpoint capability model (platform-neutral).
 *
 * Describes what an endpoint can reach printers through and how it can deliver
 * jobs. Capabilities are normalized booleans and method lists — not Windows- or
 * vendor-specific assumptions.
 */
import {
  isExecutionMethod,
  type ExecutionMethod,
} from "../executionCapabilities";

export interface EndpointTransportCapabilities {
  /** Direct USB attachment (device path, OS spooler, etc.). */
  usb: boolean;
  /** Bluetooth peripheral delivery. */
  bluetooth: boolean;
  /** TCP/IP or host:port LAN delivery. */
  network: boolean;
  /** Apple AirPrint / IPP-style discovery and delivery. */
  airprint: boolean;
  /** Third-party vendor SDK or cloud connector channel. */
  vendorConnector: boolean;
}

export interface EndpointExecutionCapabilities {
  /** Endpoint can execute print jobs on-device without upstream relay. */
  localPrinting: boolean;
  /** Supported delivery methods (raw ESC/POS, spooler, AirPrint, vendor SDK, …). */
  methods: ExecutionMethod[];
}

export interface EndpointCapabilities {
  transports: EndpointTransportCapabilities;
  execution: EndpointExecutionCapabilities;
}

export class EndpointCapabilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointCapabilityValidationError";
  }
}

const TRANSPORT_FIELDS: Array<keyof EndpointTransportCapabilities> = [
  "usb",
  "bluetooth",
  "network",
  "airprint",
  "vendorConnector",
];

export function validateEndpointTransportCapabilities(
  transports: unknown
): EndpointTransportCapabilities {
  if (!transports || typeof transports !== "object") {
    throw new EndpointCapabilityValidationError("Endpoint transports are required");
  }

  const value = transports as Record<string, unknown>;
  const normalized = {} as EndpointTransportCapabilities;

  for (const field of TRANSPORT_FIELDS) {
    if (typeof value[field] !== "boolean") {
      throw new EndpointCapabilityValidationError(
        `Transport ${field} must be boolean`
      );
    }
    normalized[field] = value[field];
  }

  return normalized;
}

export function validateEndpointExecutionCapabilities(
  execution: unknown
): EndpointExecutionCapabilities {
  if (!execution || typeof execution !== "object") {
    throw new EndpointCapabilityValidationError(
      "Endpoint execution capabilities are required"
    );
  }

  const value = execution as Record<string, unknown>;
  if (typeof value.localPrinting !== "boolean") {
    throw new EndpointCapabilityValidationError(
      "execution.localPrinting must be boolean"
    );
  }

  if (!Array.isArray(value.methods)) {
    throw new EndpointCapabilityValidationError("execution.methods must be an array");
  }

  const methods: ExecutionMethod[] = [];
  const seen = new Set<string>();

  for (const method of value.methods) {
    if (typeof method !== "string" || !isExecutionMethod(method)) {
      throw new EndpointCapabilityValidationError(
        `Invalid execution method: ${String(method)}`
      );
    }
    if (seen.has(method)) {
      continue;
    }
    seen.add(method);
    methods.push(method);
  }

  return {
    localPrinting: value.localPrinting,
    methods,
  };
}

export function validateEndpointCapabilities(
  capabilities: unknown
): EndpointCapabilities {
  if (!capabilities || typeof capabilities !== "object") {
    throw new EndpointCapabilityValidationError("Endpoint capabilities are required");
  }

  const value = capabilities as Record<string, unknown>;

  return {
    transports: validateEndpointTransportCapabilities(value.transports),
    execution: validateEndpointExecutionCapabilities(value.execution),
  };
}

export function fingerprintEndpointCapabilities(
  capabilities: EndpointCapabilities
): string {
  return JSON.stringify({
    transports: capabilities.transports,
    execution: {
      localPrinting: capabilities.execution.localPrinting,
      methods: [...capabilities.execution.methods].sort(),
    },
  });
}
