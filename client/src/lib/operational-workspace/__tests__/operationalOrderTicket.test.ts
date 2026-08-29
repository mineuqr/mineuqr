/**
 * ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  operationalTicketSourceLabel,
  printOperationalOrderTicket,
  toOperationalOrderTicketViewModel,
  type OperationalOrderTicketSource,
} from "../operationalOrderTicket";

function ticketSource(
  overrides: Partial<OperationalOrderTicketSource> &
    Pick<OperationalOrderTicketSource, "orderingChannel" | "displayReference">
): OperationalOrderTicketSource {
  return {
    orderNumber: "ORD-0005",
    businessDay: "2026-08-29",
    dailyDisplayNumber: 5,
    identityScope: "KIOSK",
    fulfilmentAnchorType: "counter",
    serviceMode: "take_away",
    fulfilmentLabel: "Take Away",
    tableNumber: 0,
    createdAt: "2026-08-29T10:15:00.000Z",
    lineItems: [
      { nameAr: "صنف أ", nameEn: "Item A", quantity: 2 },
      { nameAr: "صنف ب", nameEn: "Item B", quantity: 1 },
    ],
    ...overrides,
  };
}

const FINANCIAL_LEAK =
  /price|unitPrice|subtotal|discount|tax|total|tender|payment|invoice|settlement|paid|grandTotal|currency/i;

describe("ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1 ticket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("prints pending, preparing, ready, and served from the same operational projection", () => {
    for (const status of ["pending", "preparing", "ready", "served"] as const) {
      const vm = toOperationalOrderTicketViewModel(
        ticketSource({
          displayReference: "K #005",
          orderingChannel: "kiosk",
        }),
        "en"
      );
      expect(vm.orderReference, status).toBe("K #005");
      expect(vm.items.map((i) => i.lineLabel)).toEqual([
        "Item A × 2",
        "Item B × 1",
      ]);
    }
  });

  it("does not Accept, Cancel, or change status — projection has no lifecycle target", () => {
    const vm = toOperationalOrderTicketViewModel(
      ticketSource({ displayReference: "K #005", orderingChannel: "kiosk" }),
      "en"
    );
    expect(JSON.stringify(vm)).not.toMatch(/accept|cancel|preparing|updateStatus/i);
    expect(vm).not.toHaveProperty("targetStatus");
    expect(vm).not.toHaveProperty("status");
  });

  it("preserves K# / T# / WT# / P# from the existing identity resolver", () => {
    expect(
      toOperationalOrderTicketViewModel(
        ticketSource({
          displayReference: "K #005",
          identityScope: "KIOSK",
          orderingChannel: "kiosk",
        }),
        "en"
      ).orderReference
    ).toBe("K #005");
    expect(
      toOperationalOrderTicketViewModel(
        ticketSource({
          displayReference: "T #005",
          identityScope: "TABLE",
          orderingChannel: "qr",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "5",
          tableNumber: 5,
          serviceMode: "table_service",
        }),
        "en"
      ).orderReference
    ).toBe("T #005");
    expect(
      toOperationalOrderTicketViewModel(
        ticketSource({
          displayReference: "WT #005",
          identityScope: "WAITER",
          orderingChannel: "waiter_tablet",
          fulfilmentAnchorType: "table",
          fulfilmentLabel: "8",
          tableNumber: 8,
          serviceMode: "table_service",
        }),
        "en"
      ).orderReference
    ).toBe("WT #005");
    expect(
      toOperationalOrderTicketViewModel(
        ticketSource({
          displayReference: "P #005",
          identityScope: "POS",
          orderingChannel: "cashier_pos",
        }),
        "en"
      ).orderReference
    ).toBe("P #005");
  });

  it("uses existing source labels and table/channel — never defaults everything to TABLE", () => {
    expect(operationalTicketSourceLabel("kiosk", "en")).toBe("Self-Order");
    expect(operationalTicketSourceLabel("waiter_tablet", "en")).toBe("Waiter Order");
    expect(operationalTicketSourceLabel("qr", "en")).toBe("Table Order");
    expect(operationalTicketSourceLabel("table_session", "en")).toBe("Table Order");
    expect(operationalTicketSourceLabel("cashier_pos", "en")).toBe("Counter");
    expect(operationalTicketSourceLabel("kiosk", "ar")).toBe("طلب ذاتي");

    const kiosk = toOperationalOrderTicketViewModel(
      ticketSource({ displayReference: "K #005", orderingChannel: "kiosk" }),
      "en"
    );
    expect(kiosk.sourceLabel).toBe("Self-Order");
    expect(kiosk.tableOrChannelLabel).toContain("Self-Order");
    expect(kiosk.tableOrChannelLabel).not.toMatch(/^Table /);

    const table = toOperationalOrderTicketViewModel(
      ticketSource({
        displayReference: "T #005",
        identityScope: "TABLE",
        orderingChannel: "qr",
        fulfilmentAnchorType: "table",
        fulfilmentLabel: "5",
        tableNumber: 5,
        serviceMode: "table_service",
      }),
      "en"
    );
    expect(table.sourceLabel).toBe("Table Order");
    expect(table.tableOrChannelLabel).toContain("Table 5");

    const waiter = toOperationalOrderTicketViewModel(
      ticketSource({
        displayReference: "WT #005",
        identityScope: "WAITER",
        orderingChannel: "waiter_tablet",
        fulfilmentAnchorType: "table",
        fulfilmentLabel: "8",
        tableNumber: 8,
        serviceMode: "table_service",
      }),
      "en"
    );
    expect(waiter.sourceLabel).toBe("Waiter Order");
    expect(waiter.tableOrChannelLabel).toContain("Table 8");

    const pos = toOperationalOrderTicketViewModel(
      ticketSource({
        displayReference: "P #005",
        identityScope: "POS",
        orderingChannel: "cashier_pos",
      }),
      "en"
    );
    expect(pos.sourceLabel).toBe("Counter");
    expect(pos.tableOrChannelLabel).toContain("Counter");
  });

  it("uses the existing Order createdAt — not print-click time", () => {
    const createdAt = "2026-08-29T10:15:00.000Z";
    const vm = toOperationalOrderTicketViewModel(
      ticketSource({
        displayReference: "K #005",
        orderingChannel: "kiosk",
        createdAt,
      }),
      "en"
    );
    expect(vm.orderTimeSource).toBe(createdAt);
    expect(vm.orderTimeLabel.length).toBeGreaterThan(0);
    expect(vm.orderTimeLabel).not.toBe(new Date().toISOString());
  });

  it("prints item names and quantities in Order item order with no money", () => {
    const vm = toOperationalOrderTicketViewModel(
      ticketSource({ displayReference: "K #005", orderingChannel: "kiosk" }),
      "en"
    );
    expect(vm.items).toEqual([
      { name: "Item A", quantity: 2, lineLabel: "Item A × 2" },
      { name: "Item B", quantity: 1, lineLabel: "Item B × 1" },
    ]);
    expect(JSON.stringify(vm)).not.toMatch(FINANCIAL_LEAK);
  });

  it("keeps the same structural ticket across Kiosk, Waiter, Table/QR, and POS", () => {
    const channels = [
      { orderingChannel: "kiosk", displayReference: "K #005", identityScope: "KIOSK" },
      {
        orderingChannel: "waiter_tablet",
        displayReference: "WT #005",
        identityScope: "WAITER",
        fulfilmentAnchorType: "table",
        fulfilmentLabel: "2",
        tableNumber: 2,
        serviceMode: "table_service",
      },
      {
        orderingChannel: "qr",
        displayReference: "T #005",
        identityScope: "TABLE",
        fulfilmentAnchorType: "table",
        fulfilmentLabel: "3",
        tableNumber: 3,
        serviceMode: "table_service",
      },
      {
        orderingChannel: "cashier_pos",
        displayReference: "P #005",
        identityScope: "POS",
      },
    ] as const;

    for (const channel of channels) {
      const vm = toOperationalOrderTicketViewModel(
        ticketSource(channel),
        "en"
      );
      expect(Object.keys(vm).sort()).toEqual(
        [
          "items",
          "orderReference",
          "orderTimeLabel",
          "orderTimeSource",
          "sourceLabel",
          "tableOrChannelLabel",
        ].sort()
      );
      expect(vm.orderReference).toBe(channel.displayReference);
      expect(vm.items).toHaveLength(2);
      expect(vm.items[0]?.quantity).toBe(2);
      expect(JSON.stringify(vm)).not.toMatch(FINANCIAL_LEAK);
    }
  });

  it("invokes the existing window.print() preview path and stays read-only", () => {
    const print = vi.fn();
    vi.stubGlobal("window", { print });
    printOperationalOrderTicket();
    expect(print).toHaveBeenCalledTimes(1);
    printOperationalOrderTicket();
    expect(print).toHaveBeenCalledTimes(2);
  });
});
