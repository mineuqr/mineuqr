/**
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1 — access decision suite.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import {
  assertRestaurantPosScope,
  resolveRestaurantPosScope,
} from "../authorization/assertRestaurantPosScope";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { isPlatformOwner } from "../../platform-owner-access/identity";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
}));
vi.mock("../../subscription-runtime", () => ({
  checkLimit: vi.fn(),
}));
vi.mock("../../platform-owner-access/identity", () => ({
  isPlatformOwner: vi.fn(() => false),
}));

import { getRestaurantById } from "../../db";
import { checkLimit } from "../../subscription-runtime";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;
const OWNER_A = 10;
const OWNER_B = 20;
const STAFF_A = 7;
const STRANGER = 99;
const ADMIN = 3;
const ACTIVE_ID = "11111111-1111-4111-8111-111111111111";

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
  overrides?: Partial<{ restaurantId: number; lifecycle: "registered" | "active" | "deactivated" | "replaced"; id: string }>
) {
  const terminal = {
    id: overrides?.id ?? ACTIVE_ID,
    restaurantId: overrides?.restaurantId ?? RESTAURANT_A,
    code: "POS-001",
    lifecycle: overrides?.lifecycle ?? ("active" as const),
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };
  await store.insert(terminal);
  return terminal;
}

function services() {
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const entitlements = new PosEntitlementService(store);
  const access = new PosAccessService(store, grants, entitlements);
  return { store, grants, access };
}

describe("POS terminal access", () => {
  beforeEach(() => {
    vi.mocked(isPlatformOwner).mockReturnValue(false);
    vi.mocked(getRestaurantById).mockImplementation(async (id: number) => {
      if (id === RESTAURANT_A) return { id, userId: OWNER_A } as never;
      if (id === RESTAURANT_B) return { id, userId: OWNER_B } as never;
      return undefined as never;
    });
    mockLimit(1);
  });

  it("allows restaurant A staff with POS_ACCESS on restaurant A active terminal", async () => {
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const scope = await resolveRestaurantPosScope(
      { user: { id: STAFF_A, role: "user" } as never },
      RESTAURANT_A,
      grants
    );
    expect(scope?.kind).toBe("pos_grant");
    const first = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    const second = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(first).toMatchObject({
      allowed: true,
      reasonCode: "granted",
      context: {
        userId: STAFF_A,
        restaurantId: RESTAURANT_A,
        terminalId: terminal.id,
        permissions: ["POS_ACCESS"],
        restaurantScope: "pos_grant",
      },
    });
    expect(second.allowed).toBe(true);
    expect(await grants.listByRestaurantUser(RESTAURANT_A, STAFF_A)).toHaveLength(1);
  });

  it("denies cross-restaurant terminal access", async () => {
    const { store, grants, access } = services();
    const terminalA = await seedTerminal(store);
    const terminalB = await seedTerminal(store, {
      restaurantId: RESTAURANT_B,
      id: "66666666-6666-4666-8666-666666666666",
    });
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const scopeA = await resolveRestaurantPosScope(
      { user: { id: STAFF_A, role: "user" } as never },
      RESTAURANT_B,
      grants
    );
    expect(scopeA).toBeNull();
    const foreign = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminalB.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(foreign.reasonCode).toBe("terminal_foreign");
    const reverse = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_B,
      terminalId: terminalA.id,
      userId: OWNER_B,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "owner",
    });
    expect(reverse.reasonCode).toBe("terminal_foreign");
  });

  it("denies owner and admin cashier access without an explicit POS grant", async () => {
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    const ownerScope = await resolveRestaurantPosScope(
      { user: { id: OWNER_A, role: "user" } as never },
      RESTAURANT_A,
      grants
    );
    const adminScope = await resolveRestaurantPosScope(
      { user: { id: ADMIN, role: "admin" } as never },
      RESTAURANT_A,
      grants
    );
    expect(ownerScope?.kind).toBe("owner");
    expect(adminScope?.kind).toBe("admin");
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: terminal.id,
          userId: OWNER_A,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "owner",
        })
      ).reasonCode
    ).toBe("pos_permission_denied");
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: terminal.id,
          userId: ADMIN,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "admin",
        })
      ).reasonCode
    ).toBe("pos_permission_denied");
  });

  it("denies staff without the required permission and ignores unrelated grants", async () => {
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "SALE_CREATE",
    });
    const scope = await resolveRestaurantPosScope(
      { user: { id: STAFF_A, role: "user" } as never },
      RESTAURANT_A,
      grants
    );
    expect(scope?.kind).toBe("pos_grant");
    const denied = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(denied.reasonCode).toBe("pos_permission_denied");
    expect(denied.context).toBeUndefined();
  });

  it("denies users who do not belong to the restaurant", async () => {
    const { grants } = services();
    await expect(
      assertRestaurantPosScope(
        { user: { id: STRANGER, role: "user" } as never },
        RESTAURANT_A,
        grants,
        "pos.access.resolve"
      )
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("does not treat PLATFORM_OWNER as a cashier shortcut", async () => {
    vi.mocked(isPlatformOwner).mockReturnValue(true);
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    const scope = await resolveRestaurantPosScope(
      { user: { id: 500, role: "user", openId: "owner-open-id" } as never },
      RESTAURANT_A,
      grants
    );
    expect(scope).toBeNull();
    const decision = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: 500,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(decision.reasonCode).toBe("pos_permission_denied");
  });

  it("enforces terminal lifecycle for operational access", async () => {
    const { store, grants, access } = services();
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const registered = await seedTerminal(store, {
      id: "22222222-2222-4222-8222-222222222222",
      lifecycle: "registered",
    });
    const deactivated = await seedTerminal(store, {
      id: "33333333-3333-4333-8333-333333333333",
      lifecycle: "deactivated",
    });
    const replaced = await seedTerminal(store, {
      id: "44444444-4444-4444-8444-444444444444",
      lifecycle: "replaced",
    });
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: registered.id,
          userId: STAFF_A,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "pos_grant",
        })
      ).reasonCode
    ).toBe("terminal_inactive");
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: deactivated.id,
          userId: STAFF_A,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "pos_grant",
        })
      ).reasonCode
    ).toBe("terminal_inactive");
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: replaced.id,
          userId: STAFF_A,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "pos_grant",
        })
      ).reasonCode
    ).toBe("terminal_inactive");
    expect(
      (
        await access.resolvePosTerminalAccess({
          restaurantId: RESTAURANT_A,
          terminalId: "55555555-5555-4555-8555-555555555555",
          userId: STAFF_A,
          requiredPermission: "POS_ACCESS",
          restaurantScope: "pos_grant",
        })
      ).reasonCode
    ).toBe("terminal_not_found");
  });

  it("fail-closes access when POS quantity is missing or zero", async () => {
    mockLimit(0);
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const denied = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(denied.reasonCode).toBe("entitlement_unavailable");
  });

  it("allows access when the restaurant has an entitled active terminal", async () => {
    mockLimit(1);
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const allowed = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(allowed.allowed).toBe(true);
    expect(allowed.context?.terminalId).toBe(terminal.id);
    expect(allowed.context?.permissions).not.toContain("SALE_CREATE");
  });

  it("does not require an operational device to access a terminal", async () => {
    const { store, grants, access } = services();
    const terminal = await seedTerminal(store);
    expect(terminal.optionalDeviceId).toBeNull();
    await grants.upsert({
      userId: STAFF_A,
      restaurantId: RESTAURANT_A,
      permission: "POS_ACCESS",
    });
    const allowed = await access.resolvePosTerminalAccess({
      restaurantId: RESTAURANT_A,
      terminalId: terminal.id,
      userId: STAFF_A,
      requiredPermission: "POS_ACCESS",
      restaurantScope: "pos_grant",
    });
    expect(allowed.allowed).toBe(true);
  });

  it("grant is idempotent and does not create access state on resolve", async () => {
    const { grants, access } = services();
    const first = await access.grant({
      restaurantId: RESTAURANT_A,
      userId: STAFF_A,
      permission: "POS_ACCESS",
      actorId: OWNER_A,
    });
    const second = await access.grant({
      restaurantId: RESTAURANT_A,
      userId: STAFF_A,
      permission: "POS_ACCESS",
      actorId: OWNER_A,
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(await grants.listByRestaurantUser(RESTAURANT_A, STAFF_A)).toHaveLength(1);
  });
});
