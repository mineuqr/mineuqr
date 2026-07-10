import { describe, expect, it } from "vitest";
import { RuntimeConfigurationManager } from "../configuration/runtimeConfigurationManager";
import { runtimeContextFactory } from "../RuntimeContextFactory";
import { RuntimeContextValidationError } from "../runtimeInstanceContext";
import type { OperationalScreenCredentials } from "../credentialStore";
import type { RuntimeGetStatusResponse } from "../runtimeTypes";

const credentials: OperationalScreenCredentials = {
  deviceId: "dev-kitchen-01",
  tokenId: "tok-abc",
  secret: "secret-value-16chars",
  pairedAt: "2026-07-10T12:00:00.000Z",
  protocolVersion: 2,
};

function sampleStatus(
  overrides: Partial<RuntimeGetStatusResponse["device"]> = {}
): RuntimeGetStatusResponse {
  return {
    device: {
      deviceId: "dev-kitchen-01",
      role: "kitchen_display",
      displayName: "Kitchen Screen A",
      restaurantId: 720007,
      branchId: 3,
      status: "active",
      ...overrides,
    },
    screenConfig: {
      language: "ar",
      displayDirection: "rtl",
      displayDensity: "large",
      visibleCategoryIds: [1, 2],
    },
    configVersion: "42",
    health: {
      presence: "online",
      operational: true,
      status: "active",
      reportedVersion: "web",
      lastSeenAt: "2026-07-10T12:05:00.000Z",
      hasActiveToken: true,
    },
  };
}

describe("RuntimeContextFactory RUNTIME-INSTANCE-CONTEXT-1", () => {
  it("resolves a frozen RuntimeInstanceContext snapshot", () => {
    const instance = runtimeContextFactory.resolve({
      credentials,
      status: sampleStatus(),
      bootstrapId: "boot-001",
    });

    expect(instance.identity.instanceId).toBe("boot-001");
    expect(instance.identity.businessId).toBe("720007");
    expect(instance.identity.displayIdentity).toBe("Kitchen Screen A");
    expect(instance.role.role).toBe("kitchen_display");
    expect(instance.role.permissions.canAccessKitchenQueue).toBe(true);
    expect(instance.business.tenantId).toBe(720007);
    expect(instance.business.branchId).toBe(3);
    expect(instance.session.sessionId).toBe("tok-abc");
    expect(instance.metadata.schemaVersion).toBe(1);
    expect(Object.isFrozen(instance)).toBe(true);
    expect(Object.isFrozen(instance.identity)).toBe(true);
  });

  it("rejects credential/device mismatch before bootstrap", () => {
    expect(() =>
      runtimeContextFactory.resolve({
        credentials,
        status: sampleStatus({ deviceId: "dev-other" }),
        bootstrapId: "boot-002",
      })
    ).toThrow(RuntimeContextValidationError);
  });

  it("rejects disabled devices and inactive tokens", () => {
    expect(() =>
      runtimeContextFactory.resolve({
        credentials,
        status: sampleStatus({ status: "disabled" }),
        bootstrapId: "boot-003",
      })
    ).toThrow(/disabled/i);

    expect(() =>
      runtimeContextFactory.resolve({
        credentials,
        status: {
          ...sampleStatus(),
          health: { ...sampleStatus().health, hasActiveToken: false },
        },
        bootstrapId: "boot-004",
      })
    ).toThrow(/active token/i);
  });

  it("builds OperationalScreenRuntimeContext from the instance snapshot", () => {
    const status = sampleStatus();
    const instance = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-005",
    });
    const configManager = new RuntimeConfigurationManager();
    const runtimeConfiguration = runtimeContextFactory.loadConfiguration(status, configManager);

    const context = runtimeContextFactory.buildRuntimeContext({
      instance,
      bootstrapId: "boot-005",
      phase: "running",
      runtimeHealth: status.health,
      runtimeConfiguration,
      lastAppliedVersion: null,
    });

    expect(context.instance).toBe(instance);
    expect(context.identity.deviceId).toBe("dev-kitchen-01");
    expect(context.identity.restaurantId).toBe(720007);
    expect(context.configurationVersion).toBe(runtimeConfiguration.version);
  });

  it("supports atomic refresh replacement", () => {
    const status = sampleStatus();
    const first = runtimeContextFactory.resolve({
      credentials,
      status,
      bootstrapId: "boot-006",
    });
    const second = runtimeContextFactory.refresh(
      {
        credentials,
        status: sampleStatus({ displayName: "Kitchen Screen B" }),
        bootstrapId: "boot-006",
      },
      first
    );

    expect(second.identity.displayIdentity).toBe("Kitchen Screen B");
    expect(second).not.toBe(first);
  });

  it("records heartbeat via immutable snapshot replacement", () => {
    const instance = runtimeContextFactory.resolve({
      credentials,
      status: sampleStatus(),
      bootstrapId: "boot-007",
    });
    expect(instance.session.lastHeartbeat).toBeNull();

    const updated = runtimeContextFactory.withHeartbeat(instance, "2026-07-10T12:10:00.000Z");
    expect(updated.session.lastHeartbeat).toBe("2026-07-10T12:10:00.000Z");
    expect(instance.session.lastHeartbeat).toBeNull();
  });
});
