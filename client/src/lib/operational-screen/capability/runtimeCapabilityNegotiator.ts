import type {
  CapabilityAdapter,
  CapabilityId,
  CapabilityNegotiationInput,
  RuntimeCapabilityContract,
} from "./runtimeCapabilityContract";
import {
  negotiateRoleCapabilities,
  runtimeCapabilityRegistry,
  type RuntimeCapabilityRegistry,
} from "./runtimeCapabilityRegistry";

export type NegotiationTimelineEntry = {
  at: string;
  capabilityId: CapabilityId;
  status: CapabilityAdapter["status"];
  providerSource: string;
  fallback?: string;
};

/**
 * RUNTIME-CAPABILITY-NEGOTIATION-1 — centralized capability negotiator.
 */
export class RuntimeCapabilityNegotiator {
  private lastContract: RuntimeCapabilityContract | null = null;
  private timeline: NegotiationTimelineEntry[] = [];

  constructor(private readonly registry: RuntimeCapabilityRegistry = runtimeCapabilityRegistry) {}

  negotiate(input: CapabilityNegotiationInput): RuntimeCapabilityContract {
    const contract = negotiateRoleCapabilities(input);
    const now = new Date().toISOString();

    for (const id of contract.supportedFeatures) {
      const adapter = contract.capabilities[id];
      this.timeline.push({
        at: now,
        capabilityId: id,
        status: adapter.status,
        providerSource: adapter.providerSource,
      });
    }

    for (const failure of contract.negotiationSummary.failures) {
      const adapter = contract.capabilities[failure.capabilityId];
      this.timeline.push({
        at: now,
        capabilityId: failure.capabilityId,
        status: adapter.status,
        providerSource: adapter.providerSource,
        fallback: failure.reason,
      });
    }

    this.lastContract = contract;
    return contract;
  }

  resolve(capabilityId: CapabilityId, contract?: RuntimeCapabilityContract): CapabilityAdapter | null {
    const source = contract ?? this.lastContract;
    if (!source) return null;
    return source.capabilities[capabilityId] ?? null;
  }

  getLastContract(): RuntimeCapabilityContract | null {
    return this.lastContract;
  }

  getTimeline(): NegotiationTimelineEntry[] {
    return [...this.timeline];
  }

  getRegistry(): RuntimeCapabilityRegistry {
    return this.registry;
  }
}

export const runtimeCapabilityNegotiator = new RuntimeCapabilityNegotiator();
