/**
 * THERMAL-PRINTING-8D.2 — deterministic platform identity consistency validation.
 */
import type {
  PlatformConsistencyValidationInput,
  PlatformConsistencyValidationResult,
} from "./platformConsistencyTypes";

export const PLATFORM_IDENTITY_MISMATCH_REASON = "Platform identity mismatch";

export function formatPlatformMismatchReason(
  helloPlatform: string,
  capabilityPlatform: string
): string {
  return `${PLATFORM_IDENTITY_MISMATCH_REASON}: hello=${helloPlatform}, capability=${capabilityPlatform}`;
}

export function validatePlatformConsistency(
  input: PlatformConsistencyValidationInput
): PlatformConsistencyValidationResult {
  const consistent = input.helloPlatform === input.capabilityPlatform;

  if (consistent) {
    return {
      agentId: input.agentId,
      helloPlatform: input.helloPlatform,
      capabilityPlatform: input.capabilityPlatform,
      consistent: true,
    };
  }

  return {
    agentId: input.agentId,
    helloPlatform: input.helloPlatform,
    capabilityPlatform: input.capabilityPlatform,
    consistent: false,
    reason: formatPlatformMismatchReason(input.helloPlatform, input.capabilityPlatform),
  };
}
