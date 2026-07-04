import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";

export type OperationalActionId =
  | "accept-order"
  | "start-preparing"
  | "mark-ready"
  | "serve-order"
  | "cancel-order"
  | "restore-order";

export type OperationalAction = {
  id: OperationalActionId;
  targetStatus: OrderLifecycleStatus;
  labelEn: string;
  labelAr: string;
  variant: "primary" | "secondary" | "destructive";
};

const ACTIONS: Record<OperationalActionId, Omit<OperationalAction, "id">> = {
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

/** Kitchen execution workspace — no lifecycle actions. */
export function getKitchenWorkspaceActions(_status: OrderLifecycleStatus): OperationalAction[] {
  return [];
}
