/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — cashier authorization foundation.
 */
import { describe, expect, it } from "vitest";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosTerminalError } from "../services/PosTerminalService";

function accessService(
  store: InMemoryPosTerminalStore,
  grants: InMemoryPosPermissionGrantStore
) {
  return new PosAccessService(store, grants, new PosEntitlementService(store));
}

async function seedActive(store: InMemoryPosTerminalStore, restaurantId = 1) {
  const terminal = {
    id: "11111111-1111-4111-8111-111111111111",
    restaurantId,
    code: "POS-001",
    lifecycle: "active" as const,
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };
  await store.insert(terminal);
  return terminal;
}

describe("POS access foundation", () => {
  it("does not treat restaurant owner as an authorized cashier", async () => {
    const store = new InMemoryPosTerminalStore();
    const terminal = await seedActive(store);
    const access = accessService(store, new InMemoryPosPermissionGrantStore());
    const decision = await access.authorize({
      restaurantId: 1,
      terminalId: terminal.id,
      userId: 99,
      permission: "POS_ACCESS",
    });
    expect(decision).toEqual({
      allowed: false,
      reasonCode: "pos_permission_denied",
    });
  });

  it("denies POS access on an inactive terminal even with a grant", async () => {
    const store = new InMemoryPosTerminalStore();
    const terminal = await seedActive(store);
    await store.updateLifecycle(terminal.id, "deactivated");
    const grants = new InMemoryPosPermissionGrantStore();
    await grants.upsert({ userId: 7, restaurantId: 1, permission: "POS_ACCESS" });
    const access = accessService(store, grants);
    const decision = await access.authorize({
      restaurantId: 1,
      terminalId: terminal.id,
      userId: 7,
      permission: "POS_ACCESS",
    });
    expect(decision).toEqual({
      allowed: false,
      reasonCode: "terminal_inactive",
    });
  });

  it("requires restaurant + terminal + user + explicit POS permission", async () => {
    const store = new InMemoryPosTerminalStore();
    const terminal = await seedActive(store);
    const grants = new InMemoryPosPermissionGrantStore();
    await grants.upsert({ userId: 7, restaurantId: 1, permission: "POS_ACCESS" });
    const access = accessService(store, grants);
    const granted = await access.authorize({
      restaurantId: 1,
      terminalId: terminal.id,
      userId: 7,
      permission: "POS_ACCESS",
    });
    expect(granted).toEqual({ allowed: true, reasonCode: "granted" });
    await expect(
      access.authorize({
        restaurantId: 2,
        terminalId: terminal.id,
        userId: 7,
        permission: "POS_ACCESS",
      })
    ).rejects.toBeInstanceOf(PosTerminalError);
  });
});
