import type { RuntimeCapabilityContract } from "./runtimeCapabilityContract";
import type { NegotiationTimelineEntry } from "./runtimeCapabilityNegotiator";

export function projectCapabilityDiagnostics(
  contract: RuntimeCapabilityContract,
  timeline: NegotiationTimelineEntry[]
): Record<string, unknown> {
  return {
    capabilityRegistry: {
      version: contract.version,
      providerCount: Object.keys(contract.capabilities).length,
      supportedFeatures: contract.supportedFeatures,
    },
    negotiationTimeline: timeline,
    capabilityVersions: Object.fromEntries(
      Object.entries(contract.capabilities).map(([id, adapter]) => [id, adapter.version])
    ),
    providerSources: Object.fromEntries(
      Object.entries(contract.capabilities).map(([id, adapter]) => [id, adapter.providerSource])
    ),
    fallbackDecisions: contract.negotiationSummary.failures,
    contract,
  };
}
