/**
 * CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1
 * CASHIER-PAYMENT-READINESS-INSTRUMENTATION-1
 * Observability-only Cashier payment-flow marks. Not financial identity.
 * Durations use performance.now(). Missing marks yield null (UNKNOWN).
 *
 * Primary L1 metric: paymentReadinessDurationMs
 *   = CASHIER_PAYMENT_WORKFLOW_START → CASHIER_PAYMENT_READY
 * Emitted when Confirm becomes usable. Does not wait for Confirm click (L3).
 */

export const CASHIER_PAYMENT_FLOW_MARKS = [
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
  /** SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1 */
  "CASHIER_TAX_INVOICE_DIALOG_OPEN",
] as const;

export type CashierPaymentFlowMark =
  (typeof CASHIER_PAYMENT_FLOW_MARKS)[number];

export type CashierPaymentFlowOutcome =
  | "completed"
  | "failed"
  | "cancelled"
  | "abandoned";

export type CashierPaymentFlowContext = {
  restaurantId?: number;
  terminalId?: string | null;
};

type MarkSample = {
  perfMs: number;
  wallMs: number;
};

export type CashierPaymentFlowSnapshot = {
  cashierFlowId: string;
  restaurantId: number | null;
  terminalId: string | null;
  orderId: number | null;
  checkId: number | null;
  outcome: CashierPaymentFlowOutcome | null;
  orderConfirmAt: string | null;
  saleRequestAt: string | null;
  saleResponseAt: string | null;
  paymentWorkflowStartAt: string | null;
  checkIntakeStartAt: string | null;
  checkIntakeEndAt: string | null;
  checkReadReadyAt: string | null;
  paymentReadyAt: string | null;
  /** L1: workflow start → Confirm usable. Not checkReadinessDurationMs. */
  paymentReadinessDurationMs: number | null;
  paymentConfirmAt: string | null;
  settlementStartAt: string | null;
  settlementEndAt: string | null;
  paymentSuccessAt: string | null;
  taxInvoiceDialogOpenAt: string | null;
  taxInvoiceReadyAt: string | null;
  saleDurationMs: number | null;
  workflowEntryDurationMs: number | null;
  intakeDurationMs: number | null;
  checkReadinessDurationMs: number | null;
  userThinkTimeMs: number | null;
  settlementDurationMs: number | null;
  postSettlementUiMs: number | null;
  paidToTaxInvoiceDialogMs: number | null;
  paidToTaxInvoiceReadyMs: number | null;
};

type FlowRecord = {
  cashierFlowId: string;
  restaurantId: number | null;
  terminalId: string | null;
  orderId: number | null;
  checkId: number | null;
  outcome: CashierPaymentFlowOutcome | null;
  marks: Partial<Record<CashierPaymentFlowMark, MarkSample>>;
};

function newFlowId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(16).slice(2)}`;
  return `cashier-flow-${rand}`;
}

function nowPerf(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return 0;
}

function elapsed(from?: MarkSample, to?: MarkSample): number | null {
  if (from == null || to == null) return null;
  const ms = to.perfMs - from.perfMs;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms);
}

function iso(sample?: MarkSample): string | null {
  if (sample == null) return null;
  return new Date(sample.wallMs).toISOString();
}

export class CashierPaymentFlowTimingRegistry {
  private readonly flows = new Map<string, FlowRecord>();

  beginFlow(context: CashierPaymentFlowContext = {}): string {
    const cashierFlowId = newFlowId();
    this.flows.set(cashierFlowId, {
      cashierFlowId,
      restaurantId: context.restaurantId ?? null,
      terminalId: context.terminalId ?? null,
      orderId: null,
      checkId: null,
      outcome: null,
      marks: {},
    });
    return cashierFlowId;
  }

  mark(flowId: string | null | undefined, name: CashierPaymentFlowMark): void {
    const flow = flowId ? this.flows.get(flowId) : undefined;
    if (!flow || flow.outcome != null) return;
    if (flow.marks[name]) return;
    flow.marks[name] = { perfMs: nowPerf(), wallMs: Date.now() };
    if (name === "CASHIER_PAYMENT_READY") {
      emitCashierPaymentReadiness(this.snapshot(flowId));
    }
  }

  attachOrderId(flowId: string | null | undefined, orderId: number): void {
    const flow = flowId ? this.flows.get(flowId) : undefined;
    if (!flow || flow.outcome != null) return;
    flow.orderId = orderId;
  }

  attachCheckId(flowId: string | null | undefined, checkId: number): void {
    const flow = flowId ? this.flows.get(flowId) : undefined;
    if (!flow || flow.outcome != null) return;
    flow.checkId = checkId;
  }

  size(): number {
    return this.flows.size;
  }

  snapshot(flowId: string | null | undefined): CashierPaymentFlowSnapshot | null {
    const flow = flowId ? this.flows.get(flowId) : undefined;
    if (!flow) return null;
    const m = flow.marks;
    return {
      cashierFlowId: flow.cashierFlowId,
      restaurantId: flow.restaurantId,
      terminalId: flow.terminalId,
      orderId: flow.orderId,
      checkId: flow.checkId,
      outcome: flow.outcome,
      orderConfirmAt: iso(m.CASHIER_ORDER_CONFIRM_CLICK),
      saleRequestAt: iso(m.CASHIER_SALE_REQUEST_START),
      saleResponseAt: iso(m.CASHIER_SALE_RESPONSE),
      paymentWorkflowStartAt: iso(m.CASHIER_PAYMENT_WORKFLOW_START),
      checkIntakeStartAt: iso(m.CASHIER_CHECK_INTAKE_START),
      checkIntakeEndAt: iso(m.CASHIER_CHECK_INTAKE_RESPONSE),
      checkReadReadyAt: iso(m.CASHIER_CHECK_READ_READY),
      paymentReadyAt: iso(m.CASHIER_PAYMENT_READY),
      paymentReadinessDurationMs: elapsed(
        m.CASHIER_PAYMENT_WORKFLOW_START,
        m.CASHIER_PAYMENT_READY
      ),
      paymentConfirmAt: iso(m.CASHIER_PAYMENT_CONFIRM_CLICK),
      settlementStartAt: iso(m.CASHIER_SETTLEMENT_REQUEST_START),
      settlementEndAt: iso(m.CASHIER_SETTLEMENT_RESPONSE),
      paymentSuccessAt: iso(m.CASHIER_PAYMENT_SUCCESS),
      taxInvoiceDialogOpenAt: iso(m.CASHIER_TAX_INVOICE_DIALOG_OPEN),
      taxInvoiceReadyAt: null,
      saleDurationMs: elapsed(
        m.CASHIER_SALE_REQUEST_START,
        m.CASHIER_SALE_RESPONSE
      ),
      workflowEntryDurationMs: elapsed(
        m.CASHIER_SALE_RESPONSE,
        m.CASHIER_PAYMENT_WORKFLOW_START
      ),
      intakeDurationMs: elapsed(
        m.CASHIER_CHECK_INTAKE_START,
        m.CASHIER_CHECK_INTAKE_RESPONSE
      ),
      checkReadinessDurationMs: elapsed(
        m.CASHIER_CHECK_INTAKE_RESPONSE,
        m.CASHIER_PAYMENT_READY
      ),
      userThinkTimeMs: elapsed(
        m.CASHIER_PAYMENT_READY,
        m.CASHIER_PAYMENT_CONFIRM_CLICK
      ),
      settlementDurationMs: elapsed(
        m.CASHIER_SETTLEMENT_REQUEST_START,
        m.CASHIER_SETTLEMENT_RESPONSE
      ),
      postSettlementUiMs: elapsed(
        m.CASHIER_SETTLEMENT_RESPONSE,
        m.CASHIER_PAYMENT_SUCCESS
      ),
      paidToTaxInvoiceDialogMs: elapsed(
        m.CASHIER_PAYMENT_SUCCESS,
        m.CASHIER_TAX_INVOICE_DIALOG_OPEN
      ),
      paidToTaxInvoiceReadyMs: null,
    };
  }

  complete(
    flowId: string | null | undefined,
    outcome: CashierPaymentFlowOutcome
  ): CashierPaymentFlowSnapshot | null {
    const flow = flowId ? this.flows.get(flowId) : undefined;
    if (!flow) return null;
    if (flow.outcome == null) flow.outcome = outcome;
    const snap = this.snapshot(flowId);
    emitCashierPaymentFlow(snap);
    this.flows.delete(flow.cashierFlowId);
    return snap;
  }
}

export const CASHIER_PAYMENT_FLOW_EVENT = "cashier_payment_flow";
export const CASHIER_PAYMENT_READINESS_EVENT = "cashier_payment_readiness";

function emitCashierPaymentReadiness(
  snapshot: CashierPaymentFlowSnapshot | null
): void {
  if (!snapshot || snapshot.paymentReadyAt == null) return;
  const payload = {
    type: CASHIER_PAYMENT_READINESS_EVENT,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: snapshot.restaurantId,
    action: "cashier.payment_readiness",
    metadata: {
      cashierFlowId: snapshot.cashierFlowId,
      orderId: snapshot.orderId,
      checkId: snapshot.checkId,
      terminalId: snapshot.terminalId,
      paymentWorkflowStartAt: snapshot.paymentWorkflowStartAt,
      paymentReadyAt: snapshot.paymentReadyAt,
      paymentReadinessDurationMs: snapshot.paymentReadinessDurationMs,
      saleDurationMs: snapshot.saleDurationMs,
      intakeDurationMs: snapshot.intakeDurationMs,
      checkReadinessDurationMs: snapshot.checkReadinessDurationMs,
    },
  };
  console.info(
    `[OPS][ORDER][info] ${CASHIER_PAYMENT_READINESS_EVENT}`,
    payload
  );
}

function emitCashierPaymentFlow(snapshot: CashierPaymentFlowSnapshot | null): void {
  if (!snapshot) return;
  const payload = {
    type: CASHIER_PAYMENT_FLOW_EVENT,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: snapshot.restaurantId,
    action: "cashier.payment_flow",
    metadata: {
      cashierFlowId: snapshot.cashierFlowId,
      orderId: snapshot.orderId,
      checkId: snapshot.checkId,
      terminalId: snapshot.terminalId,
      outcome: snapshot.outcome,
      saleDurationMs: snapshot.saleDurationMs,
      workflowEntryDurationMs: snapshot.workflowEntryDurationMs,
      intakeDurationMs: snapshot.intakeDurationMs,
      checkReadinessDurationMs: snapshot.checkReadinessDurationMs,
      paymentReadinessDurationMs: snapshot.paymentReadinessDurationMs,
      userThinkTimeMs: snapshot.userThinkTimeMs,
      settlementDurationMs: snapshot.settlementDurationMs,
      postSettlementUiMs: snapshot.postSettlementUiMs,
      orderConfirmAt: snapshot.orderConfirmAt,
      saleRequestAt: snapshot.saleRequestAt,
      saleResponseAt: snapshot.saleResponseAt,
      paymentWorkflowStartAt: snapshot.paymentWorkflowStartAt,
      checkIntakeStartAt: snapshot.checkIntakeStartAt,
      checkIntakeEndAt: snapshot.checkIntakeEndAt,
      checkReadReadyAt: snapshot.checkReadReadyAt,
      paymentReadyAt: snapshot.paymentReadyAt,
      paymentConfirmAt: snapshot.paymentConfirmAt,
      settlementStartAt: snapshot.settlementStartAt,
      settlementEndAt: snapshot.settlementEndAt,
      paymentSuccessAt: snapshot.paymentSuccessAt,
    },
  };
  console.info(
    `[OPS][ORDER][info] ${CASHIER_PAYMENT_FLOW_EVENT}`,
    payload
  );
}

export function createCashierPaymentFlowTimingRegistry(): CashierPaymentFlowTimingRegistry {
  return new CashierPaymentFlowTimingRegistry();
}

export const cashierPaymentFlowTiming = createCashierPaymentFlowTimingRegistry();
