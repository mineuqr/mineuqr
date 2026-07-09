import type { KitchenTicketLine } from "@/lib/kitchen/viewModels";
import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import { formatOrderStatusLabel } from "@/lib/orderStatusDisplay";

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
