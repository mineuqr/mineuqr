import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";

export type OperationalActionId =
  | "accept-order"
  | "start-preparing"
  | "mark-ready"
  | "serve-order"
  | "cancel-order"
  | "restore-order"
  /** SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — sessionless Check settle from Orders. */
  | "settle-self-ordering";

export type OperationalAction = {
  id: OperationalActionId;
  /** Present for kitchen lifecycle actions; omitted for money settle. */
  targetStatus?: OrderLifecycleStatus;
  labelEn: string;
  labelAr: string;
  variant: "primary" | "secondary" | "destructive";
};

const ACTIONS: Record<
  Exclude<OperationalActionId, "settle-self-ordering">,
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

const SETTLE_SELF_ORDERING: OperationalAction = {
  id: "settle-self-ordering",
  labelEn: "Settle",
  labelAr: "تحصيل",
  variant: "primary",
};

export function getOperationalActionById(id: OperationalActionId): OperationalAction {
  if (id === "settle-self-ordering") return SETTLE_SELF_ORDERING;
  return { id, ...ACTIONS[id] };
}

/** Order lifecycle actions — Orders Workspace is sole owner. */
export function getOrderWorkspaceActions(status: OrderLifecycleStatus): OperationalAction[] {
  switch (status) {
    case "pending":
      return [
        { id: "accept-order", ...ACTIONS["accept-order"] },
        { id: "cancel-order", ...ACTIONS["cancel-order"] },
      ];
    case "preparing":
      return [
        { id: "mark-ready", ...ACTIONS["mark-ready"] },
        { id: "cancel-order", ...ACTIONS["cancel-order"] },
      ];
    case "ready":
      return [
        { id: "serve-order", ...ACTIONS["serve-order"] },
        { id: "cancel-order", ...ACTIONS["cancel-order"] },
      ];
    case "served":
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
}>;

export function getOrdersWorkspaceActions(
  status: OrderLifecycleStatus,
  gate: OrdersSettlementGate = {
    sessionless: false,
    unpaidSessionless: false,
  }
): OperationalAction[] {
  const base = getOrderWorkspaceActions(status);
  if (!gate.sessionless) return base;

  const lifecycle = base.filter((a) => a.id !== "cancel-order");
  if (!gate.unpaidSessionless) {
    return lifecycle;
  }

  // LIFECYCLE-SETTLEMENT-GUARDS-1 — completion requires settlement first.
  const nonComplete = lifecycle.filter((a) => a.id !== "serve-order");
  return [
    ...nonComplete,
    SETTLE_SELF_ORDERING,
    { id: "cancel-order", ...ACTIONS["cancel-order"] },
  ];
}
