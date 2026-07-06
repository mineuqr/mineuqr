import { describe, expect, it } from "vitest";
import { runtimeCapabilityNegotiator } from "../runtimeCapabilityNegotiator";
import { buildCapabilityNegotiationInput } from "../negotiateRuntimeCapabilities";
import { deriveServerCapabilities } from "../../runtimeCapabilities";
import { resolveCapabilityPresentation } from "../resolveCapabilityPresentation";

describe("RuntimeCapabilityNegotiator", () => {
  it("kitchen role negotiates presentation_tickets as supported", () => {
    const server = deriveServerCapabilities("kitchen_display");
    const contract = runtimeCapabilityNegotiator.negotiate(
      buildCapabilityNegotiationInput("kitchen_display", server, {
        configurationActivated: true,
        densityActivated: true,
        categoriesActivated: true,
        operationalBlocked: false,
      })
    );
    expect(contract.capabilities.presentation_tickets.status).toBe("supported");
    expect(contract.capabilities.kitchen_queue.status).toBe("supported");
    expect(contract.supportedFeatures).toContain("kitchen_queue");
    expect(resolveCapabilityPresentation(contract)).not.toBe(
      resolveCapabilityPresentation(null)
    );
  });

  it("blocked role negotiates presentation as blocked", () => {
    const server = deriveServerCapabilities("pickup_display");
    const contract = runtimeCapabilityNegotiator.negotiate(
      buildCapabilityNegotiationInput("pickup_display", server, {
        operationalBlocked: true,
      })
    );
    expect(contract.capabilities.presentation_tickets.status).toBe("blocked");
    expect(resolveCapabilityPresentation(contract)).toBe(
      resolveCapabilityPresentation(contract)
    );
    expect(contract.presentationSupport).toBe("blocked");
  });

  it("print monitor capability derives from declaration", () => {
    const server = deriveServerCapabilities("print_monitor");
    expect(server.canAccessPrintMonitor).toBe(true);
    const contract = runtimeCapabilityNegotiator.negotiate(
      buildCapabilityNegotiationInput("print_monitor", server, {
        operationalBlocked: true,
      })
    );
    expect(contract.capabilities.print_monitor.status).toBe("blocked");
  });

  it("expo role supports kitchen queue via tickets capability", () => {
    const server = deriveServerCapabilities("expo_display");
    const contract = runtimeCapabilityNegotiator.negotiate(
      buildCapabilityNegotiationInput("expo_display", server, {
        configurationActivated: true,
        operationalBlocked: false,
      })
    );
    expect(contract.capabilities.kitchen_queue.status).toBe("supported");
  });
});

describe("managementCapabilityNegotiator", () => {
  it("negotiates provisioning without role name checks", async () => {
    const { negotiateManagementCapabilities } = await import("../managementCapabilityNegotiator");
    const contract = negotiateManagementCapabilities({
      screenId: "d1",
      displayName: "K",
      role: "kitchen_display",
      branchId: null,
      zoneId: null,
      canonicalState: {
        operationalState: "degraded",
        connectivityState: "connected",
        businessReadiness: "pairing_required",
        maintenanceState: "normal",
      },
      businessReadiness: "pairing_required",
      healthSummary: {
        presence: "never_seen",
        operational: false,
        hasActiveToken: false,
        warningCount: 0,
      },
      lastHeartbeat: null,
      reportedVersion: null,
      configurationVersion: "v1",
      tenantId: 1,
      updatedAt: "v1",
      createdAt: "v1",
    });
    expect(contract.capabilities.provisioning.status).toBe("supported");
  });
});
