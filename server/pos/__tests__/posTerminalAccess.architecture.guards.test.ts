/**
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1 — access architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const ACCESS_OWNED = [
  "server/pos/authorization/assertRestaurantPosScope.ts",
  "server/pos/services/PosAccessService.ts",
  "server/pos/api/posRouter.ts",
  "shared/pos/access.ts",
];

describe("POS terminal access architecture guards", () => {
  it("does not replace assertRestaurantAccess or weaken it globally", () => {
    const restaurantAccess = read("server/restaurantAccess.ts");
    const scope = read("server/pos/authorization/assertRestaurantPosScope.ts");
    const router = read("server/pos/api/posRouter.ts");
    expect(restaurantAccess).toContain("restaurant.userId !== ctx.user.id");
    expect(restaurantAccess).toContain('ctx.user.role !== "admin"');
    expect(restaurantAccess).not.toContain("POS_ACCESS");
    expect(scope).toContain("Does not replace assertRestaurantAccess");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).toContain("assertRestaurantPosScope");
    expect(router).toContain("pos.terminal.register");
    expect(router).toContain("assertRestaurantAccess(ctx, input.restaurantId, \"pos.terminal.register\")");
  });

  it("keeps POS permission explicit and ignores client-supplied grants", () => {
    const access = read("server/pos/services/PosAccessService.ts");
    const router = read("server/pos/api/posRouter.ts");
    expect(access).toContain("requiredPermission");
    expect(access).toContain("listPermissions");
    expect(access).not.toMatch(/if \(input\.permissions\)/);
    expect(router).not.toMatch(/permissions:\s*input\.permissions/);
    expect(router).not.toMatch(/role:\s*input\.role/);
    expect(router).not.toMatch(/isCashier:\s*input/);
  });

  it("does not treat owner or admin role as cashier permission", () => {
    const access = read("server/pos/services/PosAccessService.ts");
    const scope = read("server/pos/authorization/assertRestaurantPosScope.ts");
    expect(access).not.toMatch(/role === ["']admin["'][\s\S]{0,80}POS_ACCESS/);
    expect(access).not.toMatch(/userId === .*owner[\s\S]{0,80}return \{ allowed: true/);
    expect(scope).toContain('kind: "owner"');
    expect(scope).toContain('kind: "admin"');
    expect(access).toContain("pos_permission_denied");
  });

  it("does not use devices, hard-coded quantity, or settlePaid as POS auth", () => {
    for (const file of ACCESS_OWNED) {
      const src = read(file);
      expect(src, file).not.toContain('"devices"');
      expect(src, file).not.toContain("settlePaid");
      expect(src, file).not.toMatch(/included\s*=\s*1/);
      expect(src, file).not.toMatch(/posTerminals\s*=\s*1/);
    }
    const entitlement = read("server/pos/services/PosEntitlementService.ts");
    expect(entitlement).toContain("checkLimit");
    expect(entitlement).toContain("POS_TERMINALS_LIMIT_KEY");
  });

  it("does not create a parallel authentication or session system", () => {
    for (const file of ACCESS_OWNED) {
      const src = read(file);
      expect(src, file).not.toMatch(/jsonwebtoken|second JWT|pos_session|PosLogin/);
      expect(src, file).not.toContain("IdentityPlaceOrder");
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("openFinancialShift");
    }
    const router = read("server/pos/api/posRouter.ts");
    expect(router).toContain("verifiedProcedure");
    expect(router).not.toMatch(/\bsettlePaid\b|\bdirectSale\b|\bplaceOrder\b|\bcreatePayment\b/);
  });

  it("keeps Operational Device separate from POS Terminal identity", () => {
    const access = read("server/pos/services/PosAccessService.ts");
    const sql = read("drizzle/0092_pos_permission_grants.sql");
    expect(access).not.toContain("operationalDevices");
    expect(access).not.toContain("optionalDeviceId");
    expect(sql).toContain("CREATE TABLE `pos_permission_grants`");
    expect(sql).not.toMatch(/CREATE TABLE `operational_devices`/);
    expect(sql).not.toMatch(/CREATE TABLE `pos_terminals`/);
  });
});
