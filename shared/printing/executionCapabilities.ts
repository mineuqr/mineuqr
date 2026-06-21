/**
 * THERMAL-PRINTING-9A — execution capability contracts (informational only).
 *
 * Canonical model for what each platform can execute — not agent-reported state.
 */
export const EXECUTION_PLATFORMS = ["windows", "android", "ios"] as const;

export type ExecutionPlatform = (typeof EXECUTION_PLATFORMS)[number];

export const EXECUTION_TRANSPORTS = ["usb", "bluetooth", "network"] as const;

export type ExecutionTransport = (typeof EXECUTION_TRANSPORTS)[number];

export const EXECUTION_METHODS = [
  "raw-escpos",
  "spooler",
  "airprint",
  "vendor-sdk",
  "bridge-agent",
] as const;

export type ExecutionMethod = (typeof EXECUTION_METHODS)[number];

export interface PlatformExecutionCapabilities {
  platform: ExecutionPlatform;
  transports: ExecutionTransport[];
  methods: ExecutionMethod[];
  supportsEscPos: boolean;
  supportsLocalExecution: boolean;
}

export class ExecutionCapabilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionCapabilityValidationError";
  }
}

export function isExecutionPlatform(value: string): value is ExecutionPlatform {
  return (EXECUTION_PLATFORMS as readonly string[]).includes(value);
}

export function isExecutionTransport(value: string): value is ExecutionTransport {
  return (EXECUTION_TRANSPORTS as readonly string[]).includes(value);
}

export function isExecutionMethod(value: string): value is ExecutionMethod {
  return (EXECUTION_METHODS as readonly string[]).includes(value);
}

function assertUniqueValues<T extends string>(
  values: T[],
  field: string,
  validator: (value: string) => value is T
): T[] {
  const normalized: T[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!validator(value)) {
      throw new ExecutionCapabilityValidationError(`Invalid ${field}: ${value}`);
    }
    if (seen.has(value)) {
      throw new ExecutionCapabilityValidationError(`Duplicate ${field}: ${value}`);
    }
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function validatePlatformExecutionCapabilities(
  input: PlatformExecutionCapabilities
): PlatformExecutionCapabilities {
  if (!isExecutionPlatform(input.platform)) {
    throw new ExecutionCapabilityValidationError("Invalid execution platform");
  }

  const transports = assertUniqueValues(
    input.transports,
    "transport",
    isExecutionTransport
  );
  const methods = assertUniqueValues(input.methods, "method", isExecutionMethod);

  if (typeof input.supportsEscPos !== "boolean") {
    throw new ExecutionCapabilityValidationError("supportsEscPos must be boolean");
  }
  if (typeof input.supportsLocalExecution !== "boolean") {
    throw new ExecutionCapabilityValidationError("supportsLocalExecution must be boolean");
  }

  return {
    platform: input.platform,
    transports,
    methods,
    supportsEscPos: input.supportsEscPos,
    supportsLocalExecution: input.supportsLocalExecution,
  };
}
