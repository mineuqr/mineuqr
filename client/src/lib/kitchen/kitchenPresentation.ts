import type { KitchenTicketLine } from "@/lib/kitchen/viewModels";
import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import { formatOrderStatusLabel } from "@/lib/orderStatusDisplay";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";

import {
  formatProjectedFulfilmentLabel,
  type ProjectedFulfilmentPresentationSource,
} from "@/lib/order-presentation/formatProjectedFulfilment";

export type KitchenOrderType = "table" | "takeaway" | "delivery";

/**
 * Presentation-only order type from projected Operational DTO fields.
 * Does not inspect tableNumber.
 */
export function deriveKitchenOrderType(
  source: Pick<ProjectedFulfilmentPresentationSource, "serviceMode" | "fulfilmentAnchorType">
): KitchenOrderType {
  if (source.serviceMode === "delivery") return "delivery";
  if (source.serviceMode === "take_away") return "takeaway";
  if (source.fulfilmentAnchorType === "table" || source.serviceMode === "table_service") {
    return "table";
  }
  return "takeaway";
}

const ORDER_TYPE_LABELS: Record<KitchenOrderType, { en: string; ar: string }> = {
  table: { en: "Table", ar: "طاولة" },
  takeaway: { en: "Take Away", ar: "سفري" },
  delivery: { en: "Delivery", ar: "توصيل" },
};

export function formatKitchenOrderType(type: KitchenOrderType, isAr: boolean): string {
  return isAr ? ORDER_TYPE_LABELS[type].ar : ORDER_TYPE_LABELS[type].en;
}

export function formatKitchenStatusLabel(status: KitchenColumnId, isAr: boolean): string {
  return formatOrderStatusLabel(status, isAr ? "ar" : "en");
}

/** Status dot, label tone, accent, and action button — presentation only. */
export function kitchenStatusPresentation(status: KitchenColumnId): {
  dotClass: string;
  labelClass: string;
  accentClass: string;
  actionButtonClass: string;
} {
  switch (status) {
    case "pending":
      return {
        dotClass: "bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.22)]",
        labelClass: "text-sky-800 dark:text-sky-300",
        accentClass: "bg-sky-500",
        actionButtonClass:
          "bg-sky-600 text-white hover:bg-sky-700 hover:text-white focus-visible:ring-sky-500/40 active:bg-sky-800",
      };
    case "preparing":
      return {
        dotClass: "bg-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.22)]",
        labelClass: "text-orange-800 dark:text-orange-300",
        accentClass: "bg-orange-500",
        actionButtonClass:
          "bg-orange-600 text-white hover:bg-orange-700 hover:text-white focus-visible:ring-orange-500/40 active:bg-orange-800",
      };
    case "ready":
      return {
        dotClass: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.22)]",
        labelClass: "text-emerald-800 dark:text-emerald-300",
        accentClass: "bg-emerald-500",
        actionButtonClass:
          "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-500/40 active:bg-emerald-800",
      };
  }
}

/** Kitchen fulfillment line from projected DTO fields (Western digits — platform policy). */
export function formatKitchenFulfillmentLabel(
  source: ProjectedFulfilmentPresentationSource,
  isAr: boolean,
  tableUnit: "table" | "room" = "table"
): string {
  return formatProjectedFulfilmentLabel(source, { isAr, tableUnit });
}

/**
 * @deprecated GLOBAL-NUMERIC-PRESENTATION-POLICY-1 — Western digits are mandatory.
 * Kept as identity for any residual imports; do not convert to Eastern digits.
 */
export function toArabicDigits(value: number | string): string {
  return String(value);
}

/** Arabic-first product name — never prefer English when Arabic exists. */
export function productDisplayName(line: KitchenTicketLine, isAr: boolean): string {
  const ar = line.nameAr?.trim();
  const en = line.nameEn?.trim();
  if (isAr) {
    return ar || en || "";
  }
  return en || ar || "";
}

/** Kitchen-friendly quantity line, e.g. "2 × تبولة" (Western digits). */
export function formatQuantityLine(line: KitchenTicketLine, isAr: boolean): string {
  const name = productDisplayName(line, isAr);
  return `${line.quantity} × ${name}`;
}

/**
 * Compact elapsed time for kitchen headers — fully localized, distance-readable.
 * English: "12 min", "1h 30m" — Arabic: "12 دقيقة", "1 ساعة 30 دقيقة"
 * Digits are always Western (GLOBAL-NUMERIC-PRESENTATION-POLICY-1).
 */
export function formatKitchenElapsedCompact(minutes: number, isAr: boolean): string {
  const safe = Math.max(0, Math.floor(minutes));
  if (safe < 60) {
    return isAr ? `${safe} دقيقة` : `${safe} min`;
  }
  const hours = Math.floor(safe / 60);
  const rem = safe % 60;
  if (rem === 0) {
    return isAr ? `${hours} ساعة` : `${hours}h`;
  }
  return isAr ? `${hours} ساعة ${rem} دقيقة` : `${hours}h ${rem}m`;
}

/** Localized overflow label when item list is truncated. */
export function formatKitchenItemOverflow(count: number, isAr: boolean): string {
  return isAr ? `+${count} أخرى` : `+${count} more`;
}

/**
 * Elapsed-time typography — urgency via weight, size, and contrast (not color alone).
 */
export function kitchenCardElapsedClass(sla: SlaSnapshot, baseClass: string): string {
  if (sla.status === "critical") {
    return `${baseClass} text-2xl text-destructive decoration-destructive/40 underline underline-offset-[3px] xl:text-3xl`;
  }
  if (sla.status === "late" || sla.status === "at-risk") {
    return `${baseClass} text-xl text-amber-100 ring-1 ring-amber-500/40 xl:text-2xl`;
  }
  return baseClass;
}

/**
 * Glanceable elapsed time for the kitchen line.
 * Presentation only — input minutes are already computed upstream.
 */
export function formatKitchenElapsed(minutes: number, isAr: boolean): string {
  const safe = Math.max(0, Math.floor(minutes));
  if (safe < 60) {
    return isAr ? `منذ ${safe} دقيقة` : `${safe} min ago`;
  }
  const hours = Math.floor(safe / 60);
  const rem = safe % 60;
  if (rem === 0) {
    return isAr ? `منذ ${hours} ساعة` : `${hours}h ago`;
  }
  return isAr ? `منذ ${hours} ساعة ${rem} دقيقة` : `${hours}h ${rem}m ago`;
}
