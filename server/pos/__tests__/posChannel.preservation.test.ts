/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — channel preservation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  mapOrderingChannelToSalesChannel,
} from "@shared/ordering-platform/orderingChannelRegistry";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POS channel preservation", () => {
  it("keeps Table/QR reporting identity when cashier_pos exists", () => {
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_TABLE_SESSION)).toBe(
      "table"
    );
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_QR)).toBe("qr");
    expect(mapOrderingChannelToSalesChannel(ORDERING_CHANNEL_CASHIER_POS)).toBe(
      "cashier_pos"
    );
  });

  it("does not rewrite Order channel during cashier or public settlement", () => {
    const settlePaid = read("server/order/application/SettleOrderPaidService.ts");
    const checkSettle = read(
      "server/operational-session/check/CheckService.ts"
    );
    expect(settlePaid).not.toMatch(/orderingChannel\s*:/);
    expect(settlePaid).not.toMatch(/UPDATE.*orderingChannel/i);
        expect(checkSettle).not.toMatch(/orderingChannel\s*=/);
    // Check may explicitly scope the Cashier path, but it must never rewrite
    // an Order's channel identity.
    expect(checkSettle).toContain("ORDERING_CHANNEL_CASHIER_POS");

  });

  it("does not expose a POS settlement or direct-sale API in Phase 1", () => {
    const router = read("server/pos/api/posRouter.ts");
    expect(router).toContain("entitlement");
    expect(router).toContain("terminal");
    expect(router).toContain("access");
    expect(router).not.toMatch(/\bsettlePaid\b|\bdirectSale\b|\bplaceOrder\b|\bcreatePayment\b|\brefundCreate\b/);
  });
});
