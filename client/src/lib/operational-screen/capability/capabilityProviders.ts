import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import type {
  CapabilityAdapter,
  CapabilityId,
  CapabilityNegotiationInput,
  NegotiationResult,
} from "./runtimeCapabilityContract";

export type CapabilityProviderContext = CapabilityNegotiationInput & {
  declared: RoleCapabilityDeclaration;
};

export type CapabilityProvider = {
  capabilityId: CapabilityId;
  source: string;
  negotiate(ctx: CapabilityProviderContext): CapabilityAdapter;
};

function adapter(
  capabilityId: CapabilityId,
  status: NegotiationResult,
  source: string,
  extras?: Partial<Pick<CapabilityAdapter, "metadata" | "actions" | "configuration" | "state">>
): CapabilityAdapter {
  return {
    capabilityId,
    status,
    metadata: extras?.metadata ?? {},
    actions: extras?.actions ?? [],
    configuration: extras?.configuration ?? null,
    state: extras?.state ?? null,
    providerSource: source,
    version: 1,
  };
}

export const categoryFilteringProvider: CapabilityProvider = {
  capabilityId: "category_filtering",
  source: "CategoryFilteringProvider",
  negotiate(ctx) {
    if (!ctx.declared.supportsCategoryFilter) {
      return adapter("category_filtering", "unsupported", this.source);
    }
    if (ctx.operationalBlocked || ctx.deviceDisabled) {
      return adapter("category_filtering", "blocked", this.source);
    }
    if (!ctx.categoriesActivated) {
      return adapter("category_filtering", "unavailable", this.source, {
        metadata: { reason: "categories_not_activated" },
      });
    }
    return adapter("category_filtering", "supported", this.source, {
      actions: ["apply_filter", "reload"],
    });
  },
};

export const displayDensityProvider: CapabilityProvider = {
  capabilityId: "display_density",
  source: "DisplayDensityProvider",
  negotiate(ctx) {
    if (!ctx.declared.supportsDensity) {
      return adapter("display_density", "unsupported", this.source);
    }
    if (ctx.operationalBlocked || ctx.deviceDisabled) {
      return adapter("display_density", "blocked", this.source);
    }
    if (!ctx.densityActivated) {
      return adapter("display_density", "unavailable", this.source);
    }
    return adapter("display_density", "supported", this.source, {
      actions: ["apply_density", "reload"],
    });
  },
};

export const configurationProvider: CapabilityProvider = {
  capabilityId: "configuration",
  source: "ConfigurationProvider",
  negotiate(ctx) {
    if (ctx.deviceDisabled) return adapter("configuration", "blocked", this.source);
    if (!ctx.configurationActivated) {
      return adapter("configuration", "unavailable", this.source);
    }
    return adapter("configuration", "supported", this.source, {
      actions: ["reload", "apply"],
    });
  },
};

export const healthProvider: CapabilityProvider = {
  capabilityId: "health",
  source: "HealthProvider",
  negotiate(ctx) {
    if (ctx.deviceDisabled) return adapter("health", "blocked", this.source);
    return adapter("health", "supported", this.source, { actions: ["project"] });
  },
};

export const diagnosticsProvider: CapabilityProvider = {
  capabilityId: "diagnostics",
  source: "DiagnosticsProvider",
  negotiate(ctx) {
    if (ctx.deviceDisabled) return adapter("diagnostics", "blocked", this.source);
    return adapter("diagnostics", "supported", this.source, { actions: ["collect", "timeline"] });
  },
};

export const provisioningProvider: CapabilityProvider = {
  capabilityId: "provisioning",
  source: "ProvisioningProvider",
  negotiate() {
    return adapter("provisioning", "unavailable", this.source, {
      metadata: { reason: "device_runtime_only" },
    });
  },
};

export const kitchenQueueProvider: CapabilityProvider = {
  capabilityId: "kitchen_queue",
  source: "KitchenQueueProvider",
  negotiate(ctx) {
    if (!ctx.declared.supportsTickets && !ctx.declared.supportsQueue) {
      return adapter("kitchen_queue", "unsupported", this.source);
    }
    if (ctx.operationalBlocked) {
      return adapter("kitchen_queue", "blocked", this.source);
    }
    if (!ctx.canAccessKitchenQueue) {
      return adapter("kitchen_queue", "unavailable", this.source, {
        metadata: { reason: "server_api_denied" },
      });
    }
    return adapter("kitchen_queue", "supported", this.source, {
      actions: ["poll_queue", "filter"],
    });
  },
};

export const printMonitorProvider: CapabilityProvider = {
  capabilityId: "print_monitor",
  source: "PrintMonitorProvider",
  negotiate(ctx) {
    if (!ctx.declared.supportsPrintMonitor) {
      return adapter("print_monitor", "unsupported", this.source);
    }
    if (ctx.operationalBlocked) {
      return adapter("print_monitor", "blocked", this.source);
    }
    if (!ctx.canAccessPrintMonitor) {
      return adapter("print_monitor", "unavailable", this.source);
    }
    return adapter("print_monitor", "supported", this.source, {
      actions: ["poll_print_jobs"],
    });
  },
};

export const presentationTicketsProvider: CapabilityProvider = {
  capabilityId: "presentation_tickets",
  source: "PresentationTicketsProvider",
  negotiate(ctx) {
    const queue = kitchenQueueProvider.negotiate(ctx);
    if (queue.status === "supported") {
      return adapter("presentation_tickets", "supported", this.source, {
        metadata: { presentation: "kitchen_queue" },
        actions: ["render_tickets"],
      });
    }
    if (queue.status === "blocked") {
      return adapter("presentation_tickets", "blocked", this.source);
    }
    if (queue.status === "unavailable") {
      return adapter("presentation_tickets", "unavailable", this.source);
    }
    return adapter("presentation_tickets", "unsupported", this.source);
  },
};

export const DEFAULT_CAPABILITY_PROVIDERS: CapabilityProvider[] = [
  categoryFilteringProvider,
  displayDensityProvider,
  configurationProvider,
  healthProvider,
  diagnosticsProvider,
  provisioningProvider,
  kitchenQueueProvider,
  printMonitorProvider,
  presentationTicketsProvider,
];
