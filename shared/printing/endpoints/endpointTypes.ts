/**
 * THERMAL-PRINTING-12E.2A — multi-endpoint printing: endpoint type taxonomy.
 *
 * Endpoint types describe *what kind of printing endpoint* participates in the
 * platform. They are intentionally decoupled from transport wiring or runtime
 * implementation details.
 */

export const ENDPOINT_TYPES = [
  "WINDOWS_AGENT",
  "ANDROID_RUNTIME",
  "IOS_RUNTIME",
  "LAN_PRINTER",
  "VENDOR_CONNECTOR",
] as const;

export type EndpointType = (typeof ENDPOINT_TYPES)[number];

export class EndpointTypeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointTypeValidationError";
  }
}

export function isEndpointType(value: string): value is EndpointType {
  return (ENDPOINT_TYPES as readonly string[]).includes(value);
}

export function assertEndpointType(value: string): EndpointType {
  if (!isEndpointType(value)) {
    throw new EndpointTypeValidationError(`Invalid endpoint type: ${value}`);
  }
  return value;
}

/**
 * Runtime endpoints that execute jobs locally on a device OS.
 */
export const RUNTIME_ENDPOINT_TYPES = [
  "WINDOWS_AGENT",
  "ANDROID_RUNTIME",
  "IOS_RUNTIME",
] as const satisfies readonly EndpointType[];

export type RuntimeEndpointType = (typeof RUNTIME_ENDPOINT_TYPES)[number];

export function isRuntimeEndpointType(
  endpointType: EndpointType
): endpointType is RuntimeEndpointType {
  return (RUNTIME_ENDPOINT_TYPES as readonly EndpointType[]).includes(endpointType);
}
