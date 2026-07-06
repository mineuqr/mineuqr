import type {
  CapabilityAdapter,
  CapabilityId,
  CapabilityNegotiationInput,
  CapabilityNegotiationSummary,
  RuntimeCapabilityContract,
} from "./runtimeCapabilityContract";
import { ALL_CAPABILITY_IDS } from "./runtimeCapabilityContract";
import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import { resolveRuntimeRole } from "../roles/runtimeRoleRegistry";
import type { CapabilityProvider } from "./capabilityProviders";
import { DEFAULT_CAPABILITY_PROVIDERS } from "./capabilityProviders";

/**
 * RUNTIME-CAPABILITY-NEGOTIATION-1 — single capability registry.
 */
export class RuntimeCapabilityRegistry {
  private readonly providers = new Map<CapabilityId, CapabilityProvider>();
  private versionCounter = 0;

  constructor(providers: CapabilityProvider[] = DEFAULT_CAPABILITY_PROVIDERS) {
    for (const provider of providers) {
      this.providers.set(provider.capabilityId, provider);
    }
  }

  register(provider: CapabilityProvider): void {
    this.providers.set(provider.capabilityId, provider);
  }

  getProvider(capabilityId: CapabilityId): CapabilityProvider | undefined {
    return this.providers.get(capabilityId);
  }

  listProviders(): CapabilityProvider[] {
    return Array.from(this.providers.values());
  }

  negotiate(
    input: CapabilityNegotiationInput,
    declared: RoleCapabilityDeclaration
  ): RuntimeCapabilityContract {
    const ctx = { ...input, declared };
    const capabilities = {} as Record<CapabilityId, CapabilityAdapter>;

    for (const id of ALL_CAPABILITY_IDS) {
      const provider = this.providers.get(id);
      capabilities[id] =
        provider?.negotiate(ctx) ??
        ({
          capabilityId: id,
          status: "unavailable",
          metadata: { reason: "no_provider" },
          actions: [],
          configuration: null,
          state: null,
          providerSource: "none",
          version: 0,
        } satisfies CapabilityAdapter);
    }

    const summary = summarize(capabilities);
    this.versionCounter += 1;

    return {
      runtimeVersion: input.runtimeVersion,
      role: input.role,
      capabilities,
      supportedFeatures: summary.supported,
      configurationSupport: capabilities.configuration.status,
      presentationSupport: capabilities.presentation_tickets.status,
      healthSupport: capabilities.health.status,
      diagnosticsSupport: capabilities.diagnostics.status,
      version: this.versionCounter,
      updatedAt: new Date().toISOString(),
      negotiationSummary: summary,
    };
  }
}

function summarize(capabilities: Record<CapabilityId, CapabilityAdapter>): CapabilityNegotiationSummary {
  const summary: CapabilityNegotiationSummary = {
    supported: [],
    unsupported: [],
    blocked: [],
    unavailable: [],
    deprecated: [],
    failures: [],
  };

  for (const [id, adapter] of Object.entries(capabilities) as [CapabilityId, CapabilityAdapter][]) {
    if (adapter.status === "supported") summary.supported.push(id);
    else if (adapter.status === "unsupported") summary.unsupported.push(id);
    else if (adapter.status === "blocked") summary.blocked.push(id);
    else if (adapter.status === "unavailable") {
      summary.unavailable.push(id);
      summary.failures.push({
        capabilityId: id,
        reason: String(adapter.metadata.reason ?? "unavailable"),
      });
    } else if (adapter.status === "deprecated") summary.deprecated.push(id);
  }

  return summary;
}

export const runtimeCapabilityRegistry = new RuntimeCapabilityRegistry();

export function negotiateRoleCapabilities(
  input: CapabilityNegotiationInput
): RuntimeCapabilityContract {
  const declared = resolveRuntimeRole(input.role).metadata.capabilities;
  return runtimeCapabilityRegistry.negotiate(input, declared);
}
