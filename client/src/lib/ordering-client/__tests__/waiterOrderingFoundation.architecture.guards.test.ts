import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildWaiterTableCheckoutIdentity,
  createWaiterStationCartScopeAdapter,
} from "../index";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("WAITER-ORDERING-FOUNDATION-1 architecture guards", () => {
  it("Waiter host composes Client Platform providers without place-order forks", () => {
    const host = read(
      "client/src/lib/ordering-client/waiter/WaiterOrderingClientHost.tsx"
    );
    expect(host).toContain("ORDERING_CHANNEL_WAITER_TABLET");
    expect(host).toContain("OrderingClientProvider");
    expect(host).toContain("OrderingBrowseProvider");
    expect(host).toContain("OrderingCartProvider");
    expect(host).toContain("OrderingCheckoutProvider");
    expect(host).toContain("createWaiterStationCartScopeAdapter");
    expect(host).not.toContain("placeWithIdentity");
    expect(host).not.toContain("placeAsWaiter");
    expect(host).not.toContain("PlaceOrderService");
  });

  it("waiter shell owns auth/tables chrome only", () => {
    const shell = read("client/src/pages/waiter/WaiterShell.tsx");
    expect(shell).toContain("WaiterOrderingClientHost");
    expect(shell).toContain("WaiterTablesStage");
    expect(shell).toContain("WaiterTableWorkspaceStage");
    expect(shell).toContain("useAuth");
    expect(shell).not.toContain("PlaceOrderService");
    expect(shell).not.toContain("resolveBusinessIdentityScope");
  });

  it("binding hardening reuses Session Platform reads without QR adopt-active path", () => {
    const guard = read(
      "client/src/lib/ordering-client/waiter/useWaiterSessionBindingGuard.ts"
    );
    const policy = read(
      "client/src/lib/ordering-client/waiter/waiterSessionBinding.ts"
    );
    const recovery = read("client/src/lib/diningSessionRecovery.ts");
    expect(guard).toContain("session.getByToken");
    expect(guard).toContain("session.getActiveByTable");
    expect(guard).toContain("attachDiningSessionRevalidationListeners");
    expect(guard).not.toContain("recoverDiningSession");
    expect(policy).toContain("Does NOT adopt a replacement session");
    // QR recovery remains the only adopt-active-session path.
    expect(recovery).toContain("getActiveByTable");
    expect(recovery).toContain("saveDiningSession");
  });

  it("checkout identity uses staff placeAuth + table_service", () => {
    const identity = buildWaiterTableCheckoutIdentity({
      tableId: 9,
      tableNumber: 3,
    });
    expect(identity.serviceMode).toBe("table_service");
    expect(identity.fulfilmentAnchor.anchorType).toBe("table");
    expect(identity.placeAuth).toBe("staff");
  });

  it("waiter cart scope isolates by station + table + session", () => {
    const adapter = createWaiterStationCartScopeAdapter({
      slug: "demo",
      stationId: "waiter",
      tableNumber: 4,
      sessionId: "55",
    });
    expect(adapter.channel).toBe("waiter_tablet");
    expect(adapter.resolveScopeKey()).toContain("table");
    expect(adapter.resolveScopeKey()).toContain("session");
  });

  it("server placeAsWaiter forces WAITER scope and restaurant access", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("placeAsWaiter");
    expect(routers).toContain('identityScope: "WAITER"');
    expect(routers).toContain("assertRestaurantAccess");
    expect(routers).toContain("waiterRouter");
    expect(routers).toContain("attachTable");
    expect(routers).toContain("resolveOperationalSession");
  });

  it("Business Identity scope includes WAITER → WT", () => {
    const scope = read(
      "server/order/business-identity/application/resolveBusinessIdentityScope.ts"
    );
    expect(scope).toContain('"WAITER"');
    expect(scope).toContain('"WT"');
  });

  it("browse stage reuses MenuBrowseArea", () => {
    const browse = read("client/src/pages/waiter/WaiterBrowseStage.tsx");
    expect(browse).toContain("MenuBrowseArea");
    expect(browse).not.toContain("getRuntimeBySlug");
  });
});
