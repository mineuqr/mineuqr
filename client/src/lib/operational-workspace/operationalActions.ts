import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";

export type OperationalActionId =
  | "accept-order"
  | "start-preparing"
  | "mark-ready"
  | "serve-order"
  | "cancel-order"
  | "restore-order"
  /** CHANNEL-TAXONOMY-CLEANUP-1 — operational Cashier handoff, not money settle. */
  | "send-to-cashier"
  /** ORDER-CARD-PRINT-ACTION-1 — read/print only; not a lifecycle or money action. */
  | "print-order";

export type OperationalAction = {
  id: OperationalActionId;
  /** Present for kitchen lifecycle actions; omitted for money settle. */
  targetStatus?: OrderLifecycleStatus;
  labelEn: string;
  labelAr: string;
  variant: "primary" | "secondary" | "destructive";
};

const ACTIONS: Record<
  Exclude<OperationalActionId, "send-to-cashier" | "print-order">,
  Omit<OperationalAction, "id">
> = {
  "accept-order": {
    targetStatus: "preparing",
    labelEn: "Accept Order",
    labelAr: "قبول الطلب",
    variant: "primary",
  },
  "start-preparing": {
    targetStatus: "preparing",
    labelEn: "Start Preparing",
    labelAr: "بدء التحضير",
    variant: "primary",
  },
  "mark-ready": {
    targetStatus: "ready",
    labelEn: "Mark Ready",
    labelAr: "جاهز للتقديم",
    variant: "primary",
  },
  "serve-order": {
    targetStatus: "served",
    labelEn: "Serve Order",
    labelAr: "تقديم الطلب",
    variant: "secondary",
  },
  "cancel-order": {
    targetStatus: "cancelled",
    labelEn: "Cancel Order",
    labelAr: "إلغاء الطلب",
    variant: "destructive",
  },
  "restore-order": {
    targetStatus: "pending",
    labelEn: "Restore Order",
    labelAr: "استعادة الطلب",
    variant: "secondary",
  },
};

const SEND_TO_CASHIER: OperationalAction = {
  id: "send-to-cashier",
  labelEn: "Send to Cashier",
  labelAr: "إرسال للكاشير",
  variant: "primary",
};

const PRINT_ORDER: OperationalAction = {
  id: "print-order",
  labelEn: "Print",
  labelAr: "طباعة",
  variant: "secondary",
};

export function isPrintOrderAction(id: OperationalActionId): boolean {
  return id === "print-order";
}

export function getOperationalActionById(id: OperationalActionId): OperationalAction {
  if (id === "send-to-cashier") return SEND_TO_CASHIER;
  if (id === "print-order") return PRINT_ORDER;
  return { id, ...ACTIONS[id] };
}

/**
 * ORDER-CARD-PRINT-ACTION-1 — Print is independent of Cancel visibility.
 * Pending: Accept, Print, Cancel. After accept: Print remains; Cancel does not.
 */
function withPrintAction(
  actions: OperationalAction[],
  status: OrderLifecycleStatus
): OperationalAction[] {
  if (status === "cancelled") return actions;
  if (actions.some((action) => action.id === "print-order")) return actions;
  const acceptIdx = actions.findIndex((action) => action.id === "accept-order");
  if (acceptIdx >= 0) {
    return [
      ...actions.slice(0, acceptIdx + 1),
      PRINT_ORDER,
      ...actions.slice(acceptIdx + 1),
    ];
  }
  return [...actions, PRINT_ORDER];
}

/** Order lifecycle actions — Orders Workspace is sole owner. */
export function getOrderWorkspaceActions(status: OrderLifecycleStatus): OperationalAction[] {
  switch (status) {
    case "pending":
      return withPrintAction(
        [
          { id: "accept-order", ...ACTIONS["accept-order"] },
          { id: "cancel-order", ...ACTIONS["cancel-order"] },
        ],
        status
      );
    case "preparing":
      return withPrintAction(
        [{ id: "mark-ready", ...ACTIONS["mark-ready"] }],
        status
      );
    case "ready":
      return withPrintAction(
        [{ id: "serve-order", ...ACTIONS["serve-order"] }],
        status
      );
    case "served":
      return withPrintAction([], status);
    case "cancelled":
      return [];
    default:
      return [];
  }
}

/**
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 /
 * LIFECYCLE-SETTLEMENT-GUARDS-1 —
 * Settlement-aware Orders actions for Self Ordering (sessionless) Orders.
 *
 * - Unpaid sessionless: prep lifecycle only + Settle + Cancel (no serve/complete)
 * - Paid sessionless: kitchen complete allowed; cancel blocked
 * - Sessioned (Waiter / Table QR): unchanged lifecycle (serve unpaid allowed)
 */
export type OrdersSettlementGate = Readonly<{
  sessionless: boolean;
  unpaidSessionless: boolean;
  /** Canonical OrderingChannelId — cashier_pos skips inbound Accept. */
  orderingChannel?: string | null;
}>;

function isCashierPosOrder(channel: string | null | undefined): boolean {
  return channel === ORDERING_CHANNEL_CASHIER_POS;
}

const CASHIER_POS_READY: OperationalAction = {
  id: "mark-ready",
  targetStatus: "ready",
  labelEn: "Ready",
  labelAr: "جاهز",
  variant: "primary",
};

const CASHIER_POS_SERVE: OperationalAction = {
  id: "serve-order",
  targetStatus: "served",
  labelEn: "Served",
  labelAr: "تم التقديم",
  variant: "secondary",
};

function getCashierPosOrdersActions(
  status: OrderLifecycleStatus,
  _gate: OrdersSettlementGate
): OperationalAction[] {
  if (status === "cancelled") return [];
  // Orders Workspace listActive uses paid-visible cashier_pos membership.
  // Dining Session membership still excludes cashier_pos.
  // Cancel is invalid on that surface (settled Check cannot be voided).
  // Unpaid cashier_pos is not listed; void remains the existing money path.
  // Served is terminal — تم التقديم must not remain as a live action.
  if (status === "served") return withPrintAction([], status);
  // KITCHEN-READY-ACTION-UNIFICATION-1 — cashier preparing → ready → served.
  if (status === "preparing") return withPrintAction([CASHIER_POS_READY], status);
  if (status === "ready") return withPrintAction([CASHIER_POS_SERVE], status);
  // Leftover pending cashier_pos: تم التقديم still walks to served.
  return withPrintAction([CASHIER_POS_SERVE], status);
}

export function getOrdersWorkspaceActions(
  status: OrderLifecycleStatus,
  gate: OrdersSettlementGate = {
    sessionless: false,
    unpaidSessionless: false,
  }
): OperationalAction[] {
  if (isCashierPosOrder(gate.orderingChannel)) {
    return getCashierPosOrdersActions(status, gate);
  }
  const base = getOrderWorkspaceActions(status);
  if (!gate.sessionless) return base;

  const lifecycle = base.filter((a) => a.id !== "cancel-order");
  if (!gate.unpaidSessionless) {
    return withPrintAction(lifecycle, status);
  }

  // LIFECYCLE-SETTLEMENT-GUARDS-1 — completion requires settlement first.
  const nonComplete = lifecycle.filter((a) => a.id !== "serve-order");
  return withPrintAction(
    [
      ...nonComplete,
      SEND_TO_CASHIER,
      ...(status === "pending"
        ? [{ id: "cancel-order" as const, ...ACTIONS["cancel-order"] }]
        : []),
    ],
    status
  );
}
