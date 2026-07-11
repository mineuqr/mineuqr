import type { DelayReason } from "@/lib/operational-workspace/delayIntelligence";
import type { OperationalActionId } from "@/lib/operational-workspace/operationalActions";
import type { SlaSnapshot, SlaStatus } from "@/lib/operational-workspace/slaEngine";

/** Bilingual presentation label — UI selects by language at render time only. */
export type LocalizedLabel = Readonly<{
  en: string;
  ar: string;
}>;

export type OrderPresentationLifecycle = "active" | "completed" | "archived";

export type OrderPresentationPriority = SlaSnapshot["urgencyTier"];

export type OrderPresentationBadge = Readonly<{
  id: string;
  label: LocalizedLabel;
  tone: "default" | "warning" | "danger" | "success" | "info";
}>;

export type OrderPresentationIndicator = Readonly<{
  id: string;
  visible: boolean;
  message: LocalizedLabel;
  tone: "default" | "warning" | "danger";
}>;

export type OrderPresentationAction = Readonly<{
  id: OperationalActionId;
  label: LocalizedLabel;
  variant: "primary" | "secondary" | "destructive";
}>;

export type OrderPresentationLineItem = Readonly<{
  lineItemId: number;
  quantityLabel: string;
  nameEn: string;
  nameAr: string;
}>;

export type OrderPresentationTiming = Readonly<{
  elapsedSeconds: number;
  elapsedMinutes: number;
  columnElapsedMinutes: number;
  targetSeconds: number;
  lateSeconds: number;
  overdue: boolean;
  priority: OrderPresentationPriority;
  slaStatus: SlaStatus;
  urgencyTier: OrderPresentationPriority;
  elapsedLabel: LocalizedLabel;
  elapsedCompactLabel: LocalizedLabel;
  targetLabel: LocalizedLabel;
  lateLabel: LocalizedLabel | null;
  indicatorTone: "default" | "warning" | "danger" | "muted";
  elapsedClassName: string;
}>;

export type OrderPresentationEmphasis = Readonly<{
  cardBorderClass: string;
  statusAccentClass: string;
  statusLabelClass: string;
  actionButtonClass: string;
}>;

export type OrderPresentationDelay = Readonly<{
  reason: DelayReason;
  message: LocalizedLabel;
  showWarning: boolean;
  warningTone: "amber" | "destructive" | null;
}>;

/**
 * ORDER-WORKSPACE-CARD-ARCHITECTURE-1 — immutable presentation contract for order cards.
 * Cards consume this model only; they must not format read-model fields.
 */
export type OrderPresentationModel = Readonly<{
  orderId: number;
  identity: Readonly<{
    displayNumber: string;
    displayReference: string;
    businessDay: string | null;
    businessIdentityLabel: LocalizedLabel;
  }>;
  lifecycle: OrderPresentationLifecycle;
  lifecycleLabel: LocalizedLabel;
  status: string;
  statusLabel: LocalizedLabel;
  timing: OrderPresentationTiming;
  customer: Readonly<{
    name: string | null;
    summary: string | null;
  }>;
  fulfillment: Readonly<{
    tableNumber: number;
    label: LocalizedLabel;
  }>;
  items: Readonly<{
    summary: LocalizedLabel;
    count: number;
    lines: readonly OrderPresentationLineItem[];
  }>;
  notes: string | null;
  totalAmount: string | null;
  badges: readonly OrderPresentationBadge[];
  indicators: readonly OrderPresentationIndicator[];
  delay: OrderPresentationDelay;
  emphasis: OrderPresentationEmphasis;
  availableActions: readonly OrderPresentationAction[];
}>;

export function pickLocalizedLabel(label: LocalizedLabel, isAr: boolean): string {
  return isAr ? label.ar : label.en;
}
