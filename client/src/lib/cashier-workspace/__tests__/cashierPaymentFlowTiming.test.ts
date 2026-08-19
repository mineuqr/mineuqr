/**
 * CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1
 * Client timing registry: system latency vs user think time.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CASHIER_PAYMENT_FLOW_EVENT,
  CASHIER_PAYMENT_READINESS_EVENT,
  createCashierPaymentFlowTimingRegistry,
  type CashierPaymentFlowMark,
} from "../cashierPaymentFlowTiming";

const ALL_MARKS: CashierPaymentFlowMark[] = [
  "CASHIER_ORDER_CONFIRM_CLICK",
  "CASHIER_SALE_REQUEST_START",
  "CASHIER_SALE_RESPONSE",
  "CASHIER_PAYMENT_WORKFLOW_START",
  "CASHIER_CHECK_INTAKE_START",
  "CASHIER_CHECK_INTAKE_RESPONSE",
  "CASHIER_CHECK_READ_READY",
  "CASHIER_PAYMENT_READY",
  "CASHIER_PAYMENT_CONFIRM_CLICK",
  "CASHIER_SETTLEMENT_REQUEST_START",
  "CASHIER_SETTLEMENT_RESPONSE",
  "CASHIER_PAYMENT_SUCCESS",
];

function installPerfClock() {
  let t = 0;
  const spy = vi.spyOn(performance, "now").mockImplementation(() => t);
  return {
    set(ms: number) {
      t = ms;
    },
    restore() {
      spy.mockRestore();
    },
  };
}

function markAt(
  registry: ReturnType<typeof createCashierPaymentFlowTimingRegistry>,
  clock: ReturnType<typeof installPerfClock>,
  flowId: string,
  name: CashierPaymentFlowMark,
  at: number
) {
  clock.set(at);
  registry.mark(flowId, name);
}

describe("cashier payment-flow timing registry", () => {
  let info: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    info = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    info.mockRestore();
  });

  it("1. records a normal Cashier sale/payment flow with independent durations", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow({
      restaurantId: 1,
      terminalId: "term-a",
    });
    registry.attachOrderId(flowId, 101);
    registry.attachCheckId(flowId, 9001);
    markAt(registry, clock, flowId, "CASHIER_ORDER_CONFIRM_CLICK", 0);
    markAt(registry, clock, flowId, "CASHIER_SALE_REQUEST_START", 10);
    markAt(registry, clock, flowId, "CASHIER_SALE_RESPONSE", 1310);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_WORKFLOW_START", 1320);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_START", 1330);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_RESPONSE", 1730);
    markAt(registry, clock, flowId, "CASHIER_CHECK_READ_READY", 2030);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 2040);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_CONFIRM_CLICK", 6840);
    markAt(registry, clock, flowId, "CASHIER_SETTLEMENT_REQUEST_START", 6850);
    markAt(registry, clock, flowId, "CASHIER_SETTLEMENT_RESPONSE", 7550);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_SUCCESS", 7650);
    const snap = registry.complete(flowId, "completed");
    clock.restore();
    expect(snap?.cashierFlowId).toMatch(/^cashier-flow-/);
    expect(snap?.outcome).toBe("completed");
    expect(snap?.saleDurationMs).toBe(1300);
    expect(snap?.workflowEntryDurationMs).toBe(10);
    expect(snap?.intakeDurationMs).toBe(400);
    expect(snap?.checkReadinessDurationMs).toBe(310);
    expect(snap?.paymentReadinessDurationMs).toBe(720);
    expect(snap?.userThinkTimeMs).toBe(4800);
    expect(snap?.settlementDurationMs).toBe(700);
    expect(snap?.postSettlementUiMs).toBe(100);
    expect(snap?.saleDurationMs! + snap?.userThinkTimeMs!).toBe(6100);
    expect(info).toHaveBeenCalledWith(
      `[OPS][ORDER][info] ${CASHIER_PAYMENT_FLOW_EVENT}`,
      expect.objectContaining({
        type: CASHIER_PAYMENT_FLOW_EVENT,
        metadata: expect.objectContaining({
          cashierFlowId: flowId,
          orderId: 101,
          checkId: 9001,
          userThinkTimeMs: 4800,
        }),
      })
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("grandTotal");
  });

  it("2. keeps intake slower than sale off the payment-workflow entry path", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_SALE_REQUEST_START", 0);
    markAt(registry, clock, flowId, "CASHIER_SALE_RESPONSE", 1200);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_WORKFLOW_START", 1210);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_START", 1220);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_RESPONSE", 3200);
    const snap = registry.snapshot(flowId);
    clock.restore();
    expect(snap?.saleDurationMs).toBe(1200);
    expect(snap?.intakeDurationMs).toBe(1980);
    expect(snap?.workflowEntryDurationMs).toBe(10);
    expect(snap?.intakeDurationMs).toBeGreaterThan(snap?.saleDurationMs ?? 0);
    expect(snap?.paymentWorkflowStartAt).not.toBeNull();
    expect(snap?.checkIntakeEndAt).not.toBeNull();
  });

  it("3. treats Check read becoming available after no_membership as a separate read lifecycle", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_START", 0);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_RESPONSE", 400);
    markAt(registry, clock, flowId, "CASHIER_CHECK_READ_READY", 900);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 950);
    const snap = registry.snapshot(flowId);
    clock.restore();
    expect(snap?.intakeDurationMs).toBe(400);
    expect(snap?.checkReadinessDurationMs).toBe(550);
    expect(snap?.paymentReadinessDurationMs).toBeNull();
    expect(snap?.checkReadReadyAt).not.toBeNull();
    expect(snap?.intakeDurationMs).not.toEqual(snap?.checkReadinessDurationMs);
  });

  it("4. measures User Think Time when the cashier waits after readiness", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 2000);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_CONFIRM_CLICK", 6800);
    const snap = registry.snapshot(flowId);
    clock.restore();
    expect(snap?.userThinkTimeMs).toBe(4800);
    expect(snap?.saleDurationMs).toBeNull();
    expect(snap?.settlementDurationMs).toBeNull();
  });

  it("5. measures near-zero User Think Time on immediate confirm without fabricating sale/settlement", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 2000);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_CONFIRM_CLICK", 2005);
    const snap = registry.snapshot(flowId);
    clock.restore();
    expect(snap?.userThinkTimeMs).toBe(5);
    expect(snap?.settlementDurationMs).toBeNull();
  });

  it("6. classifies settlement failure without completed success durations", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 10);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_CONFIRM_CLICK", 20);
    markAt(registry, clock, flowId, "CASHIER_SETTLEMENT_REQUEST_START", 25);
    const snap = registry.complete(flowId, "failed");
    clock.restore();
    expect(snap?.outcome).toBe("failed");
    expect(snap?.settlementDurationMs).toBeNull();
    expect(snap?.postSettlementUiMs).toBeNull();
    expect(snap?.paymentSuccessAt).toBeNull();
  });

  it("7. classifies payment cancellation without Confirm Payment or settlement durations", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 10);
    const snap = registry.complete(flowId, "cancelled");
    clock.restore();
    expect(snap?.outcome).toBe("cancelled");
    expect(snap?.userThinkTimeMs).toBeNull();
    expect(snap?.settlementDurationMs).toBeNull();
    expect(snap?.paymentConfirmAt).toBeNull();
  });

  it("8. keeps rapid consecutive Cashier operations on independent flow identities", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const a = registry.beginFlow();
    markAt(registry, clock, a, "CASHIER_PAYMENT_READY", 0);
    markAt(registry, clock, a, "CASHIER_PAYMENT_CONFIRM_CLICK", 10);
    const first = registry.complete(a, "completed");
    const b = registry.beginFlow();
    markAt(registry, clock, b, "CASHIER_PAYMENT_READY", 100);
    markAt(registry, clock, b, "CASHIER_PAYMENT_CONFIRM_CLICK", 4900);
    const second = registry.complete(b, "completed");
    clock.restore();
    expect(first?.cashierFlowId).not.toBe(second?.cashierFlowId);
    expect(first?.userThinkTimeMs).toBe(10);
    expect(second?.userThinkTimeMs).toBe(4800);
    expect(registry.size()).toBe(0);
  });

  it("9. supports multiple simultaneous flow instances without shared startTime", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const a = registry.beginFlow();
    const b = registry.beginFlow();
    markAt(registry, clock, a, "CASHIER_SALE_REQUEST_START", 0);
    markAt(registry, clock, b, "CASHIER_SALE_REQUEST_START", 50);
    markAt(registry, clock, a, "CASHIER_SALE_RESPONSE", 1000);
    markAt(registry, clock, b, "CASHIER_SALE_RESPONSE", 300);
    expect(registry.size()).toBe(2);
    expect(registry.snapshot(a)?.saleDurationMs).toBe(1000);
    expect(registry.snapshot(b)?.saleDurationMs).toBe(250);
    clock.restore();
  });

  it("10. yields UNKNOWN (null) for missing timing boundaries instead of fabricating durations", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow();
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_CONFIRM_CLICK", 5000);
    const snap = registry.snapshot(flowId);
    clock.restore();
    expect(snap?.userThinkTimeMs).toBeNull();
    expect(snap?.saleDurationMs).toBeNull();
    expect(snap?.intakeDurationMs).toBeNull();
    expect(snap?.paymentReadyAt).toBeNull();
    expect(snap?.paymentReadinessDurationMs).toBeNull();
    for (const mark of ALL_MARKS) {
      if (mark === "CASHIER_PAYMENT_CONFIRM_CLICK") continue;
      void mark;
    }
  });

  it("demonstrates three consecutive flows where only User Think Time moves", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const thinkTimes: number[] = [];
    const saleTimes: number[] = [];
    const thinkByFlow = [5, 1800, 8];
    for (let i = 0; i < 3; i += 1) {
      const id = registry.beginFlow({ restaurantId: 1, terminalId: "t1" });
      markAt(registry, clock, id, "CASHIER_SALE_REQUEST_START", 0);
      markAt(registry, clock, id, "CASHIER_SALE_RESPONSE", 1200);
      markAt(registry, clock, id, "CASHIER_PAYMENT_WORKFLOW_START", 1210);
      markAt(registry, clock, id, "CASHIER_CHECK_INTAKE_START", 1220);
      markAt(registry, clock, id, "CASHIER_CHECK_INTAKE_RESPONSE", 1620);
      markAt(registry, clock, id, "CASHIER_CHECK_READ_READY", 1920);
      markAt(registry, clock, id, "CASHIER_PAYMENT_READY", 1930);
      markAt(
        registry,
        clock,
        id,
        "CASHIER_PAYMENT_CONFIRM_CLICK",
        1930 + thinkByFlow[i]!
      );
      markAt(
        registry,
        clock,
        id,
        "CASHIER_SETTLEMENT_REQUEST_START",
        1930 + thinkByFlow[i]! + 10
      );
      markAt(
        registry,
        clock,
        id,
        "CASHIER_SETTLEMENT_RESPONSE",
        1930 + thinkByFlow[i]! + 710
      );
      markAt(
        registry,
        clock,
        id,
        "CASHIER_PAYMENT_SUCCESS",
        1930 + thinkByFlow[i]! + 810
      );
      const snap = registry.complete(id, "completed");
      thinkTimes.push(snap?.userThinkTimeMs as number);
      saleTimes.push(snap?.saleDurationMs as number);
    }
    clock.restore();
    expect(thinkTimes).toEqual([5, 1800, 8]);
    expect(saleTimes).toEqual([1200, 1200, 1200]);
    expect(new Set(thinkTimes).size).toBe(3);
  });

  it("computes paymentReadinessDurationMs from workflow start to Confirm usable, including sale", () => {
    const clock = installPerfClock();
    const registry = createCashierPaymentFlowTimingRegistry();
    const flowId = registry.beginFlow({
      restaurantId: 1,
      terminalId: "term-a",
    });
    registry.attachOrderId(flowId, 44);
    registry.attachCheckId(flowId, 800);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_WORKFLOW_START", 0);
    markAt(registry, clock, flowId, "CASHIER_SALE_REQUEST_START", 5);
    markAt(registry, clock, flowId, "CASHIER_SALE_RESPONSE", 1305);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_START", 1310);
    markAt(registry, clock, flowId, "CASHIER_CHECK_INTAKE_RESPONSE", 1710);
    markAt(registry, clock, flowId, "CASHIER_CHECK_READ_READY", 2010);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 2020);
    const snap = registry.snapshot(flowId);
    expect(snap?.paymentReadinessDurationMs).toBe(2020);
    expect(snap?.saleDurationMs).toBe(1300);
    expect(snap?.intakeDurationMs).toBe(400);
    expect(snap?.checkReadinessDurationMs).toBe(310);
    expect(snap?.paymentReadinessDurationMs).toBeGreaterThan(
      snap?.checkReadinessDurationMs ?? 0
    );
    expect(registry.size()).toBe(1);
    expect(info).toHaveBeenCalledWith(
      `[OPS][ORDER][info] ${CASHIER_PAYMENT_READINESS_EVENT}`,
      expect.objectContaining({
        type: CASHIER_PAYMENT_READINESS_EVENT,
        restaurantId: 1,
        metadata: expect.objectContaining({
          cashierFlowId: flowId,
          orderId: 44,
          checkId: 800,
          terminalId: "term-a",
          paymentReadinessDurationMs: 2020,
          saleDurationMs: 1300,
          intakeDurationMs: 400,
        }),
      })
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("grandTotal");
    const readinessCalls = info.mock.calls.filter((call) =>
      String(call[0]).includes(CASHIER_PAYMENT_READINESS_EVENT)
    );
    expect(readinessCalls).toHaveLength(1);
    markAt(registry, clock, flowId, "CASHIER_PAYMENT_READY", 9999);
    expect(
      info.mock.calls.filter((call) =>
        String(call[0]).includes(CASHIER_PAYMENT_READINESS_EVENT)
      )
    ).toHaveLength(1);
    clock.restore();
  });
});
