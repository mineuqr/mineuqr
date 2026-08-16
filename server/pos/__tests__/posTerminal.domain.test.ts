/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — terminal identity and lifecycle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosTerminalError, PosTerminalService } from "../services/PosTerminalService";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";

const OWNER_A = 10;
const OWNER_B = 20;
const RESTAURANT_A = 1;
const RESTAURANT_B = 2;

function mockLimit(cap: number | null) {
  vi.mocked(checkLimit).mockImplementation(async ({ proposedTotal }) => {
    if (cap === null) {
      return {
        allowed: true,
        reasonCode: "unlimited",
        limitKey: "posTerminals",
        cap: null,
        proposedTotal,
        policy: "unlimited",
        source: "test",
      };
    }
    const allowed = proposedTotal <= cap;
    return {
      allowed,
      reasonCode: allowed ? "within_limit" : "limit_exceeded",
      limitKey: "posTerminals",
      cap,
      proposedTotal,
      policy: "hard",
      source: "test",
    };
  });
}

function services() {
  const store = new InMemoryPosTerminalStore();
  const entitlements = new PosEntitlementService(store);
  const terminals = new PosTerminalService(store, entitlements);
  return { store, terminals };
}

describe("POS Terminal domain", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(2);
  });

  it("creates a logical terminal identity that is not a device or cashier", async () => {
    const { terminals } = services();
    const created = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(created.code).toBe("POS-001");
    expect(created.lifecycle).toBe("registered");
    expect(created.optionalDeviceId).toBeNull();
    expect(created).not.toHaveProperty("deviceId");
    expect(created).not.toHaveProperty("userId");
    expect(created).not.toHaveProperty("registerId");
  });

  it("isolates terminals by restaurant", async () => {
    const { terminals } = services();
    const a = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
    });
    await expect(
      terminals.requireOwned(RESTAURANT_B, a.id)
    ).rejects.toBeInstanceOf(PosTerminalError);
    expect(await terminals.list(RESTAURANT_B)).toEqual([]);
  });

  it("activates, deactivates, and refuses to revive a replaced terminal", async () => {
    const { terminals } = services();
    const created = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
    });
    const active = await terminals.activate({
      restaurantId: RESTAURANT_A,
      terminalId: created.id,
      actorId: OWNER_A,
    });
    expect(active.lifecycle).toBe("active");
    const deactivated = await terminals.deactivate({
      restaurantId: RESTAURANT_A,
      terminalId: created.id,
      actorId: OWNER_A,
    });
    expect(deactivated.lifecycle).toBe("deactivated");
    const { previous, replacement } = await terminals.replace({
      restaurantId: RESTAURANT_A,
      terminalId: created.id,
      actorId: OWNER_A,
    });
    expect(previous.id).toBe(created.id);
    expect(previous.code).toBe(created.code);
    expect(previous.lifecycle).toBe("replaced");
    expect(previous.replacedByTerminalId).toBe(replacement.id);
    expect(replacement.id).not.toBe(previous.id);
    expect(replacement.code).not.toBe(previous.code);
    await expect(
      terminals.activate({
        restaurantId: RESTAURANT_A,
        terminalId: previous.id,
        actorId: OWNER_A,
      })
    ).rejects.toMatchObject({ code: "terminal_replaced" });
  });

  it("returns the same identity for duplicate registration of the same code", async () => {
    const { terminals } = services();
    const first = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
      code: "POS-FRONT",
    });
    const second = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
      code: "POS-FRONT",
    });
    expect(second.id).toBe(first.id);
    expect(await terminals.list(RESTAURANT_A)).toHaveLength(1);
  });

  it("does not consume an extra entitlement slot when replacing a provisioned terminal", async () => {
    mockLimit(1);
    const { terminals } = services();
    const first = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
    });
    const { previous, replacement } = await terminals.replace({
      restaurantId: RESTAURANT_A,
      terminalId: first.id,
      actorId: OWNER_A,
    });
    expect(previous.lifecycle).toBe("replaced");
    expect(replacement.lifecycle).toBe("registered");
    await expect(
      terminals.register({ restaurantId: RESTAURANT_A, actorId: OWNER_A })
    ).rejects.toMatchObject({ code: "COMMERCIAL_LIMIT_EXCEEDED" });
  });

  it("rejects a second replacement of the same terminal", async () => {
    const { terminals } = services();
    const first = await terminals.register({
      restaurantId: RESTAURANT_A,
      actorId: OWNER_A,
    });
    await terminals.replace({
      restaurantId: RESTAURANT_A,
      terminalId: first.id,
      actorId: OWNER_A,
    });
    await expect(
      terminals.replace({
        restaurantId: RESTAURANT_A,
        terminalId: first.id,
        actorId: OWNER_A,
      })
    ).rejects.toMatchObject({ code: "already_replaced" });
  });
});
