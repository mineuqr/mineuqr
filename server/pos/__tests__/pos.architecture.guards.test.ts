/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — architecture boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  getOrderingChannelRegistryEntry,
} from "@shared/ordering-platform/orderingChannelRegistry";
import { POS_TERMINALS_LIMIT_KEY } from "@shared/commercial-catalog/contracts";
import { LIVE_PLAN_LIMIT_KEYS } from "@shared/commercial-catalog/contracts";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const POS_OWNED = [
  "shared/pos/terminal.ts",
  "shared/pos/entitlement.ts",
  "shared/pos/permissions.ts",
  "shared/pos/access.ts",
  "server/pos/services/PosTerminalService.ts",
  "server/pos/services/PosEntitlementService.ts",
  "server/pos/services/PosAccessService.ts",
  "server/pos/api/posRouter.ts",
  "server/pos/infrastructure/InMemoryPosTerminalStore.ts",
  "server/pos/infrastructure/DrizzlePosTerminalStore.ts",
  "server/pos/infrastructure/DrizzlePosPermissionGrantStore.ts",
  "server/pos/infrastructure/posPersistenceErrors.ts",
  "server/pos/infrastructure/posStoreSelection.ts",
];

describe("POS architecture guards", () => {
  it("keeps POS Terminal distinct from Operational Device", () => {
    const sql = read("drizzle/0091_pos_terminals.sql");
    const schema = read("drizzle/schema.ts");
    const model = read("shared/pos/terminal.ts");
    expect(sql).toContain("CREATE TABLE `pos_terminals`");
    expect(sql).not.toMatch(/CREATE TABLE `operational_devices`/);
    expect(sql).not.toMatch(/REFERENCES `operational_devices`/);
    expect(schema).toContain("export const posTerminals");
    expect(schema).toContain('"pos_terminals"');
    expect(schema).toContain("export const operationalDevices");
    expect(model).toContain("optionalDeviceId");
    expect(model).not.toMatch(/deviceId:\s*string;/);
    for (const file of POS_OWNED) {
      const src = read(file);
      expect(src, file).not.toMatch(/from ["'].*operational-device/);
      expect(src, file).not.toContain("operationalDevices");
    }
  });

  it("uses commercial_limit_values / checkLimit for POS quantity, not devices", () => {
    expect(POS_TERMINALS_LIMIT_KEY).toBe("posTerminals");
    expect(LIVE_PLAN_LIMIT_KEYS).toEqual(["restaurants", "categories", "items"]);
    const entitlement = read("server/pos/services/PosEntitlementService.ts");
    const resolver = read("server/subscription-runtime/entitlementResolver.ts");
    const enforcement = read("server/subscription-runtime/enforcement.ts");
    expect(entitlement).toContain("checkLimit");
    expect(entitlement).toContain("POS_TERMINALS_LIMIT_KEY");
    expect(entitlement).not.toContain('"devices"');
    expect(resolver).toContain('if (limitKey === "posTerminals")');
    expect(resolver).toContain("return 0");
    expect(enforcement).toContain('"posTerminals"');
    expect(read("shared/pos/entitlement.ts")).not.toContain("devices");
  });

  it("scopes POS terminals to restaurants and reuses assertRestaurantAccess", () => {
    const router = read("server/pos/api/posRouter.ts");
    const service = read("server/pos/services/PosTerminalService.ts");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).not.toMatch(/restaurantId:\s*input\.restaurantId\s*,\s*entitlement/);
    expect(service).toContain("terminal.restaurantId !== restaurantId");
  });

  it("does not let POS own Order, Check, Settlement, Register, or Reporting", () => {
    for (const file of POS_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain("IdentityPlaceOrder");
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("settleCheckPaid");
      expect(src, file).not.toContain("settleOrderPaid");
      expect(src, file).not.toContain("createRegister");
      expect(src, file).not.toContain("openFinancialShift");
      expect(src, file).not.toContain("SalesChannelAnalytics");
      expect(src, file).not.toMatch(/from ["']@shared\/operational-session/);
      expect(src, file).not.toMatch(/from ["'].*reporting-platform/);
      expect(src, file).not.toMatch(/from ["'].*\/crmp/);
    }
    const router = read("server/pos/api/posRouter.ts");
    expect(router).not.toMatch(/\bsettlePaid\b|\bdirectSale\b|\bcreatePayment\b|\brefundCreate\b/);
  });

  it("registers cashier_pos canonically and does not rewrite Table/QR on settle", () => {
    const entry = getOrderingChannelRegistryEntry(ORDERING_CHANNEL_CASHIER_POS);
    expect(entry?.id).toBe("cashier_pos");
    expect(entry?.lifecycle).toBe("registered");
    expect(entry?.reportingVisible).toBe(false);
    expect(ORDERING_CHANNEL_TABLE_SESSION).toBe("table_session");
    expect(ORDERING_CHANNEL_QR).toBe("qr");

    const settle = read("server/order/application/SettleOrderPaidService.ts");
    const routers = read("server/routers.ts");
    expect(settle).not.toContain("orderingChannel");
    expect(settle).not.toContain("cashier_pos");
    expect(routers).toContain("settlePaid: publicProcedure");
    expect(routers).toContain("pos: posRouter");
    expect(routers).not.toMatch(/pos[\s\S]{0,200}settlePaid/);
  });

  it("does not treat public order.settlePaid as POS authorization", () => {
    const routers = read("server/routers.ts");
    const access = read("server/pos/services/PosAccessService.ts");
    const settleBlock = routers.slice(
      routers.indexOf("settlePaid: publicProcedure"),
      routers.indexOf("settlePaid: publicProcedure") + 800
    );
    expect(settleBlock).toContain("publicProcedure");
    expect(settleBlock).not.toContain("PosAccessService");
    expect(settleBlock).not.toContain("POS_ACCESS");
    expect(access).toContain("pos_permission_denied");
    expect(access).not.toContain("settlePaid");
  });

  it("serializes provisioned terminal replacement through Commercial occupancyDelta 0", () => {
    const service = read("server/pos/services/PosTerminalService.ts");
    expect(service).toContain("withCommercialLimitOccupancy");
    expect(service).toContain("occupancyDelta");
    expect(service).toContain("isProvisionedLifecycle(previous.lifecycle)");
    expect(service).toContain("? 0");
    expect(service).not.toContain("performReplace(null)");
    expect(service).not.toContain("PosOccupancyService");
    expect(service).not.toContain("GET_LOCK");
    expect(service).not.toContain("FROM commercial_limit_values");
  });
});
