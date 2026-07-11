import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { structuralShare } from "../structuralShare";
import {
  reconcileOrderPresentation,
  reconcileOrderPresentationList,
} from "../reconcileOrderPresentation";
import { mapActiveOrderPresentation } from "../mapOrderPresentation";
import type { ActiveOrderPresentationSource } from "../mapOrderPresentation";
import type { OrderPresentationModel } from "../orderPresentationModel";
import {
  readOrderPerfCounters,
  recordOrderPerfEvent,
  resetOrderPerfCounters,
  setOrderPerfInstrumentationEnabled,
} from "../orderPresentationInstrumentation";

const repoRoot = join(__dirname, "../../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const FIXED_NOW = new Date("2026-07-11T10:20:00.000Z");

function makeOrder(overrides: Partial<ActiveOrderPresentationSource> = {}): ActiveOrderPresentationSource {
  return {
    orderId: 1,
    orderNumber: "ORD-0001",
    businessDay: "2026-07-11",
    dailyDisplayNumber: 1,
    displayOrderNumber: "001",
    displayReference: "001",
    status: "preparing",
    lifecycle: "active",
    tableNumber: 3,
    sessionId: null,
    customerName: "Sam",
    customerPhone: null,
    notes: null,
    totalAmount: "45.00",
    createdAt: "2026-07-11 10:00:00",
    readyAt: null,
    lineItems: [{ lineItemId: 1, quantity: 2, nameAr: "تبولة", nameEn: "Tabbouleh" }],
    ...overrides,
  };
}

const mapFixed = (order: ActiveOrderPresentationSource): OrderPresentationModel =>
  mapActiveOrderPresentation(order, { now: FIXED_NOW });
const keyOf = (order: ActiveOrderPresentationSource) => String(order.orderId);

describe("ORDER-INTERACTION-PERFORMANCE-1 structural sharing", () => {
  it("returns the previous reference when values are structurally equal", () => {
    const prev = { a: 1, b: { c: [1, 2, 3] } };
    const next = { a: 1, b: { c: [1, 2, 3] } };
    expect(structuralShare(prev, next)).toBe(prev);
  });

  it("reuses unchanged sub-objects while reflecting changed ones", () => {
    const prev = { header: { title: "x" }, body: { lines: [1, 2] } };
    const next = { header: { title: "x" }, body: { lines: [1, 2, 3] } };
    const shared = structuralShare(prev, next);
    expect(shared).not.toBe(prev);
    expect(shared.header).toBe(prev.header);
    expect(shared.body).not.toBe(prev.body);
  });
});

describe("ORDER-INTERACTION-PERFORMANCE-1 presentation reconciliation", () => {
  it("preserves presentation identity when the order is unchanged", () => {
    const order = makeOrder();
    const first = mapFixed(order);
    const second = mapFixed(order);
    const reconciled = reconcileOrderPresentation(first, second);
    expect(reconciled).toBe(first);
  });

  it("preserves unchanged sections when only timing changes", () => {
    const order = makeOrder();
    const first = mapActiveOrderPresentation(order, { now: new Date("2026-07-11T10:20:00Z") });
    const later = mapActiveOrderPresentation(order, { now: new Date("2026-07-11T10:40:00Z") });
    const reconciled = reconcileOrderPresentation(first, later);
    expect(reconciled).not.toBe(first);
    expect(reconciled.identity).toBe(first.identity);
    expect(reconciled.items).toBe(first.items);
    expect(reconciled.availableActions).toBe(first.availableActions);
    expect(reconciled.timing).not.toBe(first.timing);
  });

  it("rebuilds only the changed order in a list of orders", () => {
    const sources = [makeOrder({ orderId: 1 }), makeOrder({ orderId: 2 }), makeOrder({ orderId: 3 })];

    const first = reconcileOrderPresentationList(new Map(), sources, mapFixed, keyOf);
    expect(first.mapped).toBe(3);
    expect(first.reused).toBe(0);
    expect(first.workspaceChanged).toBe(true);

    const unchanged = reconcileOrderPresentationList(first.nextByKey, sources, mapFixed, keyOf);
    expect(unchanged.reused).toBe(3);
    expect(unchanged.workspaceChanged).toBe(false);
    unchanged.presentations.forEach((presentation, index) => {
      expect(presentation).toBe(first.presentations[index]);
    });

    const changedSources = [
      sources[0]!,
      makeOrder({ orderId: 2, status: "ready" }),
      sources[2]!,
    ];
    const changed = reconcileOrderPresentationList(unchanged.nextByKey, changedSources, mapFixed, keyOf);
    expect(changed.reused).toBe(2);
    expect(changed.workspaceChanged).toBe(true);
    expect(changed.presentations[0]).toBe(first.presentations[0]);
    expect(changed.presentations[2]).toBe(first.presentations[2]);
    expect(changed.presentations[1]).not.toBe(first.presentations[1]);
    expect(changed.presentations[1]!.status).toBe("ready");
  });
});

describe("ORDER-INTERACTION-PERFORMANCE-1 mapper determinism", () => {
  it("produces structurally identical output for identical input", () => {
    const order = makeOrder();
    const a = mapFixed(order);
    const b = mapFixed(order);
    expect(structuralShare(a, b)).toBe(a);
  });
});

describe("ORDER-INTERACTION-PERFORMANCE-1 instrumentation", () => {
  afterEach(() => {
    setOrderPerfInstrumentationEnabled(false);
    resetOrderPerfCounters();
  });

  it("records events only when enabled", () => {
    setOrderPerfInstrumentationEnabled(false);
    resetOrderPerfCounters();
    recordOrderPerfEvent("presentation:mapped", 5);
    expect(readOrderPerfCounters()["presentation:mapped"]).toBe(0);

    setOrderPerfInstrumentationEnabled(true);
    resetOrderPerfCounters();
    recordOrderPerfEvent("presentation:mapped", 3);
    recordOrderPerfEvent("presentation:reused", 2);
    recordOrderPerfEvent("card:rendered");
    recordOrderPerfEvent("workspace:updated");
    const counters = readOrderPerfCounters();
    expect(counters["presentation:mapped"]).toBe(3);
    expect(counters["presentation:reused"]).toBe(2);
    expect(counters["card:rendered"]).toBe(1);
    expect(counters["workspace:updated"]).toBe(1);
  });
});

describe("ORDER-INTERACTION-PERFORMANCE-1 architecture guards", () => {
  it("memoizes order card components and instruments their renders", () => {
    const operationalCard = read("client/src/components/operational-workspace/OperationalCard.tsx");
    const kitchenCard = read("client/src/components/kitchen/KitchenExecutionCard.tsx");

    expect(operationalCard).toContain("memo(OperationalCardImpl)");
    expect(operationalCard).toContain('recordOrderPerfEvent("card:rendered")');
    expect(kitchenCard).toContain("memo(KitchenExecutionCardImpl)");
    expect(kitchenCard).toContain('recordOrderPerfEvent("card:rendered")');
  });

  it("routes workspace presentation through the stable reconciliation hook", () => {
    const ordersWorkspace = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const kitchenPanel = read("client/src/components/operational-screen/KitchenScreenPanel.tsx");

    expect(ordersWorkspace).toContain("useOrderPresentations");
    expect(ordersWorkspace).toContain("useCallback");
    expect(kitchenPanel).toContain("useOrderPresentations");
    expect(kitchenPanel).toContain("useMemo");
  });

  it("stabilizes device execution callbacks without broadening runtime scope", () => {
    const hook = read(
      "client/src/lib/operational-screen/interaction/useOperationalDeviceOrderActions.ts"
    );
    expect(hook).toContain("mutateAsyncRef");
    expect(hook).toContain("canExecuteRef");
    expect(hook).toContain("screenTrpc.operationalDevice.runtime.executeOrderAction");
  });

  it("keeps the presentation mapper pure and free of side effects", () => {
    const mapper = read("client/src/lib/order-presentation/mapOrderPresentation.ts");
    expect(mapper).not.toContain("orderPresentationInstrumentation");
    expect(mapper).not.toContain("useRef");
    expect(mapper).not.toContain("useMemo");
    expect(mapper).not.toMatch(/^let\s/m);
  });

  it("keeps performance instrumentation development-only and removable", () => {
    const instrumentation = read(
      "client/src/lib/order-presentation/orderPresentationInstrumentation.ts"
    );
    expect(instrumentation).toContain("if (!enabled) return;");
    expect(instrumentation).toContain("setOrderPerfInstrumentationEnabled");
    expect(instrumentation).toContain("import.meta");
  });
});
