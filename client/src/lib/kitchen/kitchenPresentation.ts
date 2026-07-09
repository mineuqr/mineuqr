import type { KitchenTicketLine } from "@/lib/kitchen/viewModels";
import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import { formatOrderStatusLabel } from "@/lib/orderStatusDisplay";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";

export type KitchenOrderType = "table" | "takeaway" | "delivery";

/** Presentation-only fulfillment label from existing ticket fields. */
export function deriveKitchenOrderType(tableNumber: number): KitchenOrderType {
  if (tableNumber > 0) return "table";
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

export function formatKitchenFulfillmentLabel(
  tableNumber: number,
  isAr: boolean
): string {
  const orderType = deriveKitchenOrderType(tableNumber);
  const typeLabel = formatKitchenOrderType(orderType, isAr);
  if (orderType === "table") {
    const tableValue = isAr ? toArabicDigits(tableNumber) : String(tableNumber);
    return isAr ? `${typeLabel} ${tableValue}` : `${typeLabel} ${tableNumber}`;
  }
  return typeLabel;
}

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Presentation-only: convert Western digits to Arabic-Indic digits. */
export function toArabicDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)] ?? d);
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

/** Kitchen-friendly quantity line, e.g. "١ × تبولة". */
export function formatQuantityLine(line: KitchenTicketLine, isAr: boolean): string {
  const name = productDisplayName(line, isAr);
  const qty = isAr ? toArabicDigits(line.quantity) : String(line.quantity);
  return `${qty} × ${name}`;
}

/**
 * Compact elapsed time for kitchen headers — fully localized, distance-readable.
 * English: "12 min", "1h 30m" — Arabic: "12 دقيقة", "1 ساعة 30 دقيقة"
 */
export function formatKitchenElapsedCompact(minutes: number, isAr: boolean): string {
  const safe = Math.max(0, Math.floor(minutes));
  if (safe < 60) {
    const value = isAr ? toArabicDigits(safe) : String(safe);
    return isAr ? `${value} دقيقة` : `${value} min`;
  }
  const hours = Math.floor(safe / 60);
  const rem = safe % 60;
  const h = isAr ? toArabicDigits(hours) : String(hours);
  const m = isAr ? toArabicDigits(rem) : String(rem);
  if (rem === 0) {
    return isAr ? `${h} ساعة` : `${h}h`;
  }
  return isAr ? `${h} ساعة ${m} دقيقة` : `${h}h ${m}m`;
}

/** Localized overflow label when item list is truncated. */
export function formatKitchenItemOverflow(count: number, isAr: boolean): string {
  const value = isAr ? toArabicDigits(count) : String(count);
  return isAr ? `+${value} أخرى` : `+${value} more`;
}

/**
 * Elapsed-time typography — urgency via weight, size, and contrast (not color alone).
 */
export function kitchenCardElapsedClass(sla: SlaSnapshot, baseClass: string): string {
  if (sla.status === "critical") {
    return `${baseClass} text-xl text-destructive underline decoration-destructive/50 underline-offset-4 xl:text-2xl`;
  }
  if (sla.status === "late" || sla.status === "at-risk") {
    return `${baseClass} text-lg ring-1 ring-amber-500/35 xl:text-xl`;
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
    const value = isAr ? toArabicDigits(safe) : String(safe);
    return isAr ? `منذ ${value} دقيقة` : `${value} min ago`;
  }
  const hours = Math.floor(safe / 60);
  const rem = safe % 60;
  const h = isAr ? toArabicDigits(hours) : String(hours);
  const m = isAr ? toArabicDigits(rem) : String(rem);
  if (rem === 0) {
    return isAr ? `منذ ${h} ساعة` : `${h}h ago`;
  }
  return isAr ? `منذ ${h} ساعة ${m} دقيقة` : `${h}h ${m}m ago`;
}
