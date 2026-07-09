import type { KitchenColumnId } from "@/lib/kitchen/viewModels";
import {
  deriveKitchenOrderType,
  formatKitchenOrderType,
  formatKitchenStatusLabel,
  kitchenStatusPresentation,
} from "@/lib/kitchen/kitchenPresentation";
import { cn } from "@/lib/utils";
import type { SlaSnapshot } from "@/lib/operational-workspace/slaEngine";

/**
 * Operational screen cards use English numerals exclusively for distance readability.
 * Labels remain localized; digits never switch to Arabic-Indic inside a card.
 */

export function formatOperationalElapsedCompact(minutes: number, isAr: boolean): string {
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

export function formatOperationalFulfillmentLabel(tableNumber: number, isAr: boolean): string {
  const orderType = deriveKitchenOrderType(tableNumber);
  const typeLabel = formatKitchenOrderType(orderType, isAr);
  if (orderType === "table") {
    return isAr ? `${typeLabel} ${tableNumber}` : `${typeLabel} ${tableNumber}`;
  }
  return typeLabel;
}

export function formatOperationalItemOverflow(count: number, isAr: boolean): string {
  return isAr ? `+${count} أخرى` : `+${count} more`;
}

export function formatOperationalQuantity(quantity: number): string {
  return String(quantity);
}

/** Extremely light row guide — visible only to the eye, not as table chrome. */
export const OPERATIONAL_ITEM_ROW_DIVIDER_CLASS = "border-b border-border/[0.08]";

/** Shared subtle separator weight for footer meta elements. */
export const OPERATIONAL_META_SEPARATOR_CLASS =
  "select-none px-2 text-xs font-light leading-none text-muted-foreground/45";

/** Elapsed-time emphasis in the footer row — strong weight, compact size for execution flow. */
export function operationalCardElapsedClass(sla: SlaSnapshot, baseClass: string): string {
  if (sla.status === "critical") {
    return `${baseClass} text-sm text-destructive underline decoration-destructive/50 underline-offset-[3px] xl:text-base`;
  }
  if (sla.status === "late" || sla.status === "at-risk") {
    return `${baseClass} text-xs text-amber-100 ring-1 ring-amber-500/45 xl:text-sm`;
  }
  return baseClass;
}

export function operationalFooterStatusClass(status: KitchenColumnId): string {
  const presentation = kitchenStatusPresentation(status);
  return cn("text-sm font-bold leading-none whitespace-nowrap", presentation.labelClass);
}

export function operationalFooterStatusLabel(status: KitchenColumnId, isAr: boolean): string {
  return formatKitchenStatusLabel(status, isAr);
}
