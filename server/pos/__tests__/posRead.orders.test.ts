/**
 * POS-READ-APIS-IMPLEMENTATION-1 — POS façade over Order Read / Settlement / Menu.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosCatalogReadService } from "../services/PosCatalogReadService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosOrderReadService } from "../services/PosOrderReadService";
import { PosOrderSettlementReadService } from "../services/PosOrderSettlementReadService";
import { PosReadError } from "../services/PosReadError";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";
import type { ActiveOrderListResult } from "../../order/read/domain/contracts/queryContracts";
import type { OrderSettlementDto } from "../../operational-session/check/api/orderSettlementApiDtos";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
  getMenuItemsByRestaurant: vi.fn(),
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));
vi.mock("../../platform-owner-access/identity", () => ({
  isPlatformOwner: vi.fn(() => false),
}));
vi.mock("../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";
import {
  setPosGrantStoreForTests,
  setPosStoreForTests,
} from "../posComposition";
import { appRouter } from "../../routers";
import type { TrpcContext } from "../../_core/context";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const OWNER_A = 10;
const STAFF_A = 7;
const ADMIN = 3;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";
const TERMINAL_B = "66666666-6666-4666-8666-666666666666";

function user(id: number, role: SelectUser["role"] = "user"): SelectUser {
  return { id, role } as SelectUser;
}

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

async function seedTerminal(
  store: InMemoryPosTerminalStore,
  overrides?: { restaurantId?: number; id?: string; lifecycle?: "active" | "deactivated" }
) {
  await store.insert({
    id: overrides?.id ?? TERMINAL_A,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    code: "POS-001",
    lifecycle: overrides?.lifecycle ?? "active",
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
}

async function grant(
  grants: InMemoryPosPermissionGrantStore,
  permissions: PosPermission[],
  userId = STAFF_A,
  restaurantId = RESTAURANT_A
) {
  for (const permission of permissions) {
    await grants.upsert({ userId, restaurantId, permission });
  }
}

const emptyList: ActiveOrderListResult = {
  generatedAt: "2026-08-17T00:00:00.000Z",
  projectionSchemaVersion: 1,
  queryCatalogVersion: 1,
  categoryProjectionVersion: 0,
  projectionBuildDurationMs: 0,
  projectionIntegrity: "valid",
  items: [],
  pageInfo: { hasMore: false, nextCursor: null, limit: 50 },
};

describe("POS order/catalog/settlement reads", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id: RESTAURANT_A, userId: OWNER_A };
      if (id === RESTAURANT_B) return { id: RESTAURANT_B, userId: 20 };
      return undefined;
    });
    mockLimit(5);
  });

  afterEach(() => {
    setPosStoreForTests(null);
    setPosGrantStoreForTests(null);
  });

  it("delegates listActive to Order Read using authorized restaurant scope", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    const listActive = vi.fn(async () => emptyList);
    const orders = {
      listActive,
      getDetail: vi.fn(),
      getTimeline: vi.fn(),
    };
    const service = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      orders as never
    );

    const result = await service.listActive({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        status: "pending",
        limit: 10,
      },
    });

    expect(listActive).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      status: "pending",
      limit: 10,
      cursor: undefined,
    });
    expect(result.items).toEqual([]);
  });

  it("denies owner/admin without POS_ACCESS grant", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    const service = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      { listActive: vi.fn(), getDetail: vi.fn(), getTimeline: vi.fn() } as never
    );
    await expect(
      service.listActive({
        user: user(OWNER_A),
        command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_A },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
    await expect(
      service.listActive({
        user: user(ADMIN, "admin"),
        command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_A },
      })
    ).rejects.toMatchObject({ code: "pos_permission_denied" });
  });

  it("rejects cross-tenant terminal and inactive terminal", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await seedTerminal(store, { id: TERMINAL_B, restaurantId: RESTAURANT_B });
    await grant(grants, ["POS_ACCESS"]);
    await grant(grants, ["POS_ACCESS"], STAFF_A, RESTAURANT_B);
    const service = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      { listActive: vi.fn(), getDetail: vi.fn(), getTimeline: vi.fn() } as never
    );

    await expect(
      service.listActive({
        user: user(STAFF_A),
        command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_B },
      })
    ).rejects.toMatchObject({ code: "terminal_foreign" });

    await store.updateLifecycle(TERMINAL_A, "deactivated");
    await expect(
      service.listActive({
        user: user(STAFF_A),
        command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_A },
      })
    ).rejects.toMatchObject({ code: "terminal_inactive" });
  });

  it("returns not_found for missing order detail", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    const service = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      {
        listActive: vi.fn(),
        getDetail: vi.fn(async () => null),
        getTimeline: vi.fn(),
      } as never
    );
    await expect(
      service.getDetail({
        user: user(STAFF_A),
        command: {
          restaurantId: RESTAURANT_A,
          terminalId: TERMINAL_A,
          orderId: 99,
        },
      })
    ).rejects.toBeInstanceOf(PosReadError);
  });

  it("maps catalog rows without leaking extra columns and scopes restaurant", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    const service = new PosCatalogReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      async () => [
        {
          id: 5,
          categoryId: 2,
          restaurantId: RESTAURANT_A,
          nameAr: "شاي",
          nameEn: "Tea",
          price: "4.50",
          isAvailable: true,
          sortOrder: 1,
          imageUrl: "secret",
        } as never,
        {
          id: 6,
          categoryId: 2,
          restaurantId: RESTAURANT_B,
          nameAr: "other",
          nameEn: null,
          price: "1.00",
          isAvailable: true,
          sortOrder: 2,
        },
        {
          id: 7,
          categoryId: 2,
          restaurantId: RESTAURANT_A,
          nameAr: "hidden",
          nameEn: null,
          price: "2.00",
          isAvailable: false,
          sortOrder: 3,
        },
      ]
    );

    const all = await service.listItems({
      user: user(STAFF_A),
      command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_A },
    });
    expect(all).toHaveLength(2);
    expect(all[0]).toEqual({
      menuItemId: 5,
      categoryId: 2,
      nameAr: "شاي",
      nameEn: "Tea",
      price: "4.50",
      isAvailable: true,
      sortOrder: 1,
    });
    expect(all[0]).not.toHaveProperty("imageUrl");

    const available = await service.listItems({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        availableOnly: true,
      },
    });
    expect(available).toHaveLength(1);
    expect(available[0]?.menuItemId).toBe(5);
  });

  it("delegates order settlement list to the projection read service", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    const dto = {
      restaurantId: RESTAURANT_A,
      checkId: 1,
      orderId: 55,
      settlementStatus: "pending",
    } as OrderSettlementDto;
    const listByOrder = vi.fn(async () => [dto]);
    const service = new PosOrderSettlementReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      { listByOrder } as never
    );
    const result = await service.listByOrder({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        orderId: 55,
      },
    });
    expect(listByOrder).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      orderId: 55,
    });
    expect(result).toEqual([dto]);
  });

  it("denies a grant holder on restaurant A from reading restaurant B", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await seedTerminal(store, { id: TERMINAL_B, restaurantId: RESTAURANT_B });
    await grant(grants, ["POS_ACCESS"]);
    const listActive = vi.fn(async () => emptyList);
    const service = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      { listActive, getDetail: vi.fn(), getTimeline: vi.fn() } as never
    );
    await expect(
      service.listActive({
        user: user(STAFF_A),
        command: { restaurantId: RESTAURANT_B, terminalId: TERMINAL_B },
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listActive).not.toHaveBeenCalled();
  });

  it("forwards pagination filters and returns empty catalog results", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    await grant(grants, ["POS_ACCESS"]);
    const listActive = vi.fn(async () => emptyList);
    const orders = new PosOrderReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      { listActive, getDetail: vi.fn(), getTimeline: vi.fn() } as never
    );
    await orders.listActive({
      user: user(STAFF_A),
      command: {
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
        limit: 25,
        cursor: "2026-08-17T00:00:00.000Z",
      },
    });
    expect(listActive).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      status: undefined,
      limit: 25,
      cursor: "2026-08-17T00:00:00.000Z",
    });

    const catalog = new PosCatalogReadService(
      grants,
      new PosAccessService(store, grants, new PosEntitlementService(store)),
      async () => []
    );
    await expect(
      catalog.listItems({
        user: user(STAFF_A),
        command: { restaurantId: RESTAURANT_A, terminalId: TERMINAL_A },
      })
    ).resolves.toEqual([]);
  });

  it("rejects unauthenticated router callers", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      anon.pos.read.orders.listActive({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("maps missing POS grant to FORBIDDEN at the router", async () => {
    const store = new InMemoryPosTerminalStore();
    const grants = new InMemoryPosPermissionGrantStore();
    await seedTerminal(store);
    setPosStoreForTests(store);
    setPosGrantStoreForTests(grants);
    const caller = appRouter.createCaller({
      user: user(STAFF_A),
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.pos.read.orders.listActive({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
      })
    ).rejects.toBeInstanceOf(TRPCError);
    await expect(
      caller.pos.read.orders.listActive({
        restaurantId: RESTAURANT_A,
        terminalId: TERMINAL_A,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid terminal and restaurant input at the router", async () => {
    const caller = appRouter.createCaller({
      user: user(STAFF_A),
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.pos.read.orders.listActive({
        restaurantId: RESTAURANT_A,
        terminalId: "not-a-uuid",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.pos.read.catalog.listItems({
        restaurantId: 0,
        terminalId: TERMINAL_A,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
