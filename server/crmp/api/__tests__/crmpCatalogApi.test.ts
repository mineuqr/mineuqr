/**
 * REGISTER-CATALOG-MANAGEMENT-1 — catalog API surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../../_core/context";
import { createInMemoryCrmpStore } from "../../InMemoryCrmpStore";
import { RegisterDomainService } from "../../RegisterDomainService";
import { setCrmpApiUnitOfWorkForTests } from "../crmpApiComposition";

vi.mock("../../../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

import { assertRestaurantAccess } from "../../../restaurantAccess";
import { appRouter } from "../../../routers";

function createVerifiedCaller(userId = 1) {
  return appRouter.createCaller({
    user: {
      id: userId,
      openId: `owner-${userId}`,
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("crmp.catalog API", () => {
  beforeEach(() => {
    vi.mocked(assertRestaurantAccess).mockReset();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    setCrmpApiUnitOfWorkForTests(createInMemoryCrmpStore());
  });

  afterEach(() => {
    setCrmpApiUnitOfWorkForTests(null);
  });

  it("creates, lists, activates, renames, changes type, deactivates, archives", async () => {
    const caller = createVerifiedCaller();
    const created = await caller.crmp.catalog.create({
      restaurantId: 7,
      code: "MAIN",
      displayName: "Main",
      registerType: "counter",
    });
    expect(created.register.code).toBe("MAIN");
    expect(created.register.catalogStatus).toBe("provisioned");
    expect(created.register.registerId).toBe("reg_7_main");
    expect(created).not.toHaveProperty("events");

    const listed = await caller.crmp.catalog.list({ restaurantId: 7 });
    expect(listed).toHaveLength(1);

    const activated = await caller.crmp.catalog.activate({
      restaurantId: 7,
      registerId: created.register.registerId,
    });
    expect(activated.register.catalogStatus).toBe("active");

    const renamed = await caller.crmp.catalog.rename({
      restaurantId: 7,
      registerId: created.register.registerId,
      displayName: "Main Counter",
      expectedVersion: activated.register.version,
    });
    expect(renamed.register.displayName).toBe("Main Counter");

    const typed = await caller.crmp.catalog.changeType({
      restaurantId: 7,
      registerId: created.register.registerId,
      registerType: "settlement_station",
      expectedVersion: renamed.register.version,
    });
    expect(typed.register.registerType).toBe("settlement_station");

    const searched = await caller.crmp.catalog.search({
      restaurantId: 7,
      query: "main",
    });
    expect(searched).toHaveLength(1);

    const deactivated = await caller.crmp.catalog.deactivate({
      restaurantId: 7,
      registerId: created.register.registerId,
      expectedVersion: typed.register.version,
    });
    expect(deactivated.register.catalogStatus).toBe("inactive");

    const archived = await caller.crmp.catalog.archive({
      restaurantId: 7,
      registerId: created.register.registerId,
      expectedVersion: deactivated.register.version,
    });
    expect(archived.register.archivedAt).not.toBeNull();
  });

  it("rejects duplicate code via API", async () => {
    const caller = createVerifiedCaller();
    await caller.crmp.catalog.create({
      restaurantId: 7,
      code: "DUP",
      displayName: "A",
      registerType: "counter",
      registerId: "reg_a",
    });
    await expect(
      caller.crmp.catalog.create({
        restaurantId: 7,
        code: "dup",
        displayName: "B",
        registerType: "mobile_pos",
        registerId: "reg_b",
      })
    ).rejects.toThrow();
  });

  it("create is idempotent for the same deterministic identity", async () => {
    const caller = createVerifiedCaller();
    const first = await caller.crmp.catalog.create({
      restaurantId: 7,
      code: "SAME",
      displayName: "A",
      registerType: "counter",
    });
    const second = await caller.crmp.catalog.create({
      restaurantId: 7,
      code: "same",
      displayName: "Ignored",
      registerType: "mobile_pos",
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.register.registerId).toBe(first.register.registerId);
    expect(second.register.displayName).toBe("A");
  });

  it("enforces restaurant access on catalog commands", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new Error("forbidden")
    );
    const caller = createVerifiedCaller();
    await expect(
      caller.crmp.catalog.create({
        restaurantId: 99,
        code: "X",
        displayName: "X",
        registerType: "counter",
      })
    ).rejects.toThrow("forbidden");
  });

  it("restaurant isolation on list", async () => {
    const uow = createInMemoryCrmpStore();
    setCrmpApiUnitOfWorkForTests(uow);
    const registers = new RegisterDomainService(uow);
    await registers.provision({
      restaurantId: 1,
      code: "A",
      displayName: "A",
      registerType: "counter",
    });
    await registers.provision({
      restaurantId: 2,
      code: "A",
      displayName: "B",
      registerType: "counter",
    });
    const caller = createVerifiedCaller();
    const r1 = await caller.crmp.catalog.listByRestaurant({ restaurantId: 1 });
    const r2 = await caller.crmp.catalog.listByRestaurant({ restaurantId: 2 });
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
    expect(r1[0]?.restaurantId).toBe(1);
    expect(r2[0]?.restaurantId).toBe(2);
  });
});
