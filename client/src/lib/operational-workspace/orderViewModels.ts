import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import { computeSlaSnapshot } from "./slaEngine";

export function computeOrderCardSla(status: string, createdAt: string, now = new Date()) {
  const fromMs = Date.parse(createdAt.replace(" ", "T"));
  const totalElapsed = Number.isFinite(fromMs)
    ? Math.max(0, Math.floor((now.getTime() - fromMs) / 1000))
    : 0;
  return computeSlaSnapshot(status, totalElapsed, totalElapsed);
}

export function buildLinesSummaryFromItems(
  items: Array<{ quantity: number; nameAr: string; nameEn?: string | null }>
): string {
  return items
    .map((li) => `${li.quantity}× ${li.nameEn?.trim() || li.nameAr}`)
    .join(", ");
}

export function isLateOrder(status: OrderLifecycleStatus, createdAt: string): boolean {
  const sla = computeOrderCardSla(status, createdAt);
  return sla.status === "late" || sla.status === "critical";
}
