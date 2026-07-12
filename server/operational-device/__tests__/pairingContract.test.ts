import { describe, expect, it } from "vitest";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenCredentialRecoveryService } from "../recovery/ScreenCredentialRecoveryService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

describe("PAIRING-CONTRACT-1 v2 payload", () => {
  it("recovery pairing payload includes tokenId and protocol discriminator", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const payload = recovery.buildPairingPayload(created.device, created.token);
    expect(payload).toMatchObject({
      mineuqr: "operational-screen-pairing",
      v: 2,
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });
  });
});
