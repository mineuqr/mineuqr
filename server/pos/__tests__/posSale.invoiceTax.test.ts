/**
 * CASHIER-SALE-INVOICE-TAX-PROJECTION-1 — sale.create money uses computeCheckMoney.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryPosPermissionGrantStore } from "../infrastructure/InMemoryPosPermissionGrantStore";
import { InMemoryPosSaleIdempotencyStore } from "../infrastructure/InMemoryPosSaleIdempotencyStore";
import { InMemoryPosTerminalStore } from "../infrastructure/InMemoryPosTerminalStore";
import { PosAccessService } from "../services/PosAccessService";
import { PosEntitlementService } from "../services/PosEntitlementService";
import { PosSaleService } from "../services/PosSaleService";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import type { SelectUser } from "../../../drizzle/schema";
import { freezeCashierPosPayableFromOrder } from "../../operational-session/payment/cashierPosOrderFreeze";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  captureTaxPolicySnapshot,
  businessTaxSettingsFromRestaurantRow,
} from "@shared/operational-session";

vi.mock("../../db", () => ({
  getRestaurantById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
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
vi.mock("../../order/application/mapOrderDomainError", () => ({
  runOrderCommand: async <T>(fn: () => Promise<T>) => fn(),
}));

import { getRestaurantById, getOrderItemsByOrderId } from "../../db";
import { checkLimit } from "../../subscription-runtime";

const RESTAURANT_A = 1;
const OWNER_A = 10;
const STAFF_A = 7;
const TERMINAL_A = "11111111-1111-4111-8111-111111111111";

const VAT_15 = JSON.stringify({
  version: 1,
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
});

function user(id: number): SelectUser {
  return { id, role: "user" } as SelectUser;
}

function mockLimit() {
  vi.mocked(checkLimit).mockResolvedValue({
    allowed: true,
    reasonCode: "unlimited",
    limitKey: "posTerminals",
    cap: null,
    proposedTotal: 1,
    policy: "unlimited",
    source: "test",
  });
}

function fakePlaceOrder(totalAmount: string) {
  let seq = 200;
  const execute = vi.fn(
    async (
      command: { items: readonly { quantity: number }[] },
      persist?: {
        afterPersistInTransaction?: (
          tx: unknown,
          result: {
            order: {
              id: number;
              orderNumber: string;
              trackingToken: string;
              totalAmount: string;
              createdAt: string;
              fulfilmentAnchorType: string;
              serviceMode: string;
              lines: Array<{ quantity: number; unitPrice: string }>;
            };
            outboxEventIds: string[];
            businessIdentity?: {
              businessDay: string;
              dailyDisplayNumber: number;
              identityScope: string;
            };
          }
        ) => Promise<void>;
      }
    ) => {
      seq += 1;
      const order = {
        id: seq,
        orderNumber: `ORD-${seq}`,
        trackingToken: `tok-${seq}`,
        totalAmount,
        createdAt: "2026-08-16T01:00:00.000Z",
        fulfilmentAnchorType: "station",
        serviceMode: "counter",
        lines: command.items.map((item) => ({
          quantity: item.quantity,
          unitPrice: totalAmount,
        })),
      };
      const tx = { kind: "order-tx" };
      if (persist?.afterPersistInTransaction) {
        await persist.afterPersistInTransaction(tx, {
          order,
          outboxEventIds: [],
          businessIdentity: {
            businessDay: "2026-08-16",
            dailyDisplayNumber: seq,
            identityScope: "POS",
          },
        });
      }
      return {
        order,
        events: [],
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        displayReference: `P #${String(seq).padStart(3, "0")}`,
        totalAmount: order.totalAmount,
        itemCount: command.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
        identity: {},
        sessionPersistence: "ephemeral" as const,
      };
    }
  );
  return { execute } as unknown as IdentityPlaceOrderService & {
    execute: ReturnType<typeof vi.fn>;
  };
}

async function ready(input: {
  totalAmount: string;
  taxEnabled: boolean;
  taxMode: "inclusive" | "exclusive";
}) {
  vi.mocked(getRestaurantById).mockResolvedValue({
    id: RESTAURANT_A,
    userId: OWNER_A,
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    taxEnabled: input.taxEnabled,
    taxMode: input.taxMode,
    taxPolicyJson: VAT_15,
  } as never);
  mockLimit();
  const store = new InMemoryPosTerminalStore();
  const grants = new InMemoryPosPermissionGrantStore();
  const idempotency = new InMemoryPosSaleIdempotencyStore();
  const access = new PosAccessService(
    store,
    grants,
    new PosEntitlementService(store)
  );
  await store.insert({
    id: TERMINAL_A,
    restaurantId: RESTAURANT_A,
    code: "POS-001",
    lifecycle: "active",
    replacedByTerminalId: null,
    optionalDeviceId: null,
    version: 1,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  });
  await grants.upsert({
    userId: STAFF_A,
    restaurantId: RESTAURANT_A,
    permission: "POS_ACCESS",
  });
  await grants.upsert({
    userId: STAFF_A,
    restaurantId: RESTAURANT_A,
    permission: "SALE_CREATE",
  });
  const place = fakePlaceOrder(input.totalAmount);
  const sale = new PosSaleService(grants, access, place, idempotency);
  return { sale, place };
}

const command = {
  restaurantId: RESTAURANT_A,
  terminalId: TERMINAL_A,
  items: [{ menuItemId: 41, quantity: 1 }],
  idempotencyKey: "sale-tax-projection-01",
};

describe("CASHIER-SALE-INVOICE-TAX-PROJECTION-1 sale.create money", () => {
  beforeEach(() => {
    vi.mocked(getOrderItemsByOrderId).mockResolvedValue([
      {
        id: 1,
        nameAr: "عصير",
        nameEn: "Juice",
        quantity: 1,
        price: "115.00",
      },
    ] as never);
  });

  it("projects inclusive 15% item 115 as Subtotal 100, VAT 15, Grand 115", async () => {
    const { sale, place } = await ready({
      totalAmount: "115.00",
      taxEnabled: true,
      taxMode: "inclusive",
    });
    const result = await sale.create({ user: user(STAFF_A), command });
    expect(result.money).toEqual({
      subtotal: "100.00",
      taxAmount: "15.00",
      grandTotal: "115.00",
      billDiscountAmount: "0.00",
    });
    expect(place.execute.mock.calls[0][1]).toMatchObject({
      enrollCheck: false,
    });
  });

  it("projects exclusive 15% item 100 as Subtotal 100, VAT 15, Grand 115", async () => {
    const { sale } = await ready({
      totalAmount: "100.00",
      taxEnabled: true,
      taxMode: "exclusive",
    });
    const result = await sale.create({
      user: user(STAFF_A),
      command: { ...command, idempotencyKey: "sale-tax-ex-01" },
    });
    expect(result.money).toEqual({
      subtotal: "100.00",
      taxAmount: "15.00",
      grandTotal: "115.00",
      billDiscountAmount: "0.00",
    });
  });

  it("projects tax disabled as VAT 0 and Grand Total = item value", async () => {
    const { sale } = await ready({
      totalAmount: "115.00",
      taxEnabled: false,
      taxMode: "exclusive",
    });
    const result = await sale.create({
      user: user(STAFF_A),
      command: { ...command, idempotencyKey: "sale-tax-off-01" },
    });
    expect(result.money.taxAmount).toBe("0.00");
    expect(result.money.grandTotal).toBe("115.00");
    expect(result.money.subtotal).toBe("115.00");
  });

  it("replays identical tax-complete money for the same sale key", async () => {
    const { sale, place } = await ready({
      totalAmount: "115.00",
      taxEnabled: true,
      taxMode: "inclusive",
    });
    const key = { ...command, idempotencyKey: "sale-tax-replay-01" };
    const first = await sale.create({ user: user(STAFF_A), command: key });
    const second = await sale.create({ user: user(STAFF_A), command: key });
    expect(second.replayed).toBe(true);
    expect(second.money).toEqual(first.money);
    expect(place.execute).toHaveBeenCalledTimes(1);
  });

  it("matches Confirm freeze tax and grand total when discount is 0.00", async () => {
    const { sale } = await ready({
      totalAmount: "100.00",
      taxEnabled: true,
      taxMode: "exclusive",
    });
    const result = await sale.create({
      user: user(STAFF_A),
      command: { ...command, idempotencyKey: "sale-tax-freeze-01" },
    });
    vi.mocked(getOrderItemsByOrderId).mockResolvedValue([
      {
        id: 1,
        nameAr: "عصير",
        nameEn: "Juice",
        quantity: 1,
        price: "100.00",
      },
    ] as never);
    const snapshots = {
      currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      taxPolicySnapshot: captureTaxPolicySnapshot(
        businessTaxSettingsFromRestaurantRow({
          currencyCode: "SAR",
          currencySymbol: "ر.س",
          taxEnabled: true,
          taxMode: "exclusive",
          taxPolicyJson: VAT_15,
        })
      ),
    };
    const payable = await freezeCashierPosPayableFromOrder({
      restaurantId: RESTAURANT_A,
      order: {
        id: result.orderId,
        restaurantId: RESTAURANT_A,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        orderNumber: result.orderNumber,
        totalAmount: "100.00",
      },
      billDiscountAmount: "0.00",
      snapshots,
    });
    expect(payable.freeze.taxAmount).toBe(result.money.taxAmount);
    expect(payable.freeze.grandTotal).toBe(result.money.grandTotal);
  });
});
