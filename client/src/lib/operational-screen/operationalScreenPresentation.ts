import type { KitchenTicketDto } from "@/lib/kitchen/types";
import type { OperationalScreenState } from "@/lib/operational-screen/state/operationalScreenStateContract";

const URGENCY_RANK: Record<KitchenTicketDto["urgencyTier"], number> = {
  critical: 0,
  elevated: 1,
  normal: 2,
};

/** Presentation-only sort — urgent and long-waiting tickets surface first. */
export function sortKitchenTicketsForDisplay(tickets: KitchenTicketDto[]): KitchenTicketDto[] {
  return [...tickets].sort((a, b) => {
    const urgencyDelta = URGENCY_RANK[a.urgencyTier] - URGENCY_RANK[b.urgencyTier];
    if (urgencyDelta !== 0) return urgencyDelta;
    return b.columnElapsedSeconds - a.columnElapsedSeconds;
  });
}

/** Count tickets flagged as elevated or critical by the read model. */
export function countDelayedKitchenTickets(tickets: KitchenTicketDto[]): number {
  return tickets.filter((ticket) => ticket.urgencyTier !== "normal").length;
}

export type HeaderConnectionTone = "live" | "connecting" | "degraded" | "offline" | "maintenance";

export function resolveHeaderConnectionTone(
  screenState: OperationalScreenState
): HeaderConnectionTone {
  const { operationalState, connectivityState } = screenState;

  if (
    operationalState === "disposed" ||
    connectivityState === "offline" ||
    operationalState === "disconnected"
  ) {
    return "offline";
  }

  if (
    operationalState === "degraded" ||
    connectivityState === "disconnected" ||
    connectivityState === "reconnecting"
  ) {
    return "degraded";
  }

  if (operationalState === "maintenance") {
    return "maintenance";
  }

  if (operationalState === "initializing" || connectivityState === "connecting") {
    return "connecting";
  }

  return "live";
}

const HEADER_CONNECTION_LABELS: Record<HeaderConnectionTone, { en: string; ar: string }> = {
  live: { en: "Live", ar: "متصل" },
  connecting: { en: "Connecting", ar: "جاري الاتصال" },
  degraded: { en: "Degraded", ar: "اتصال ضعيف" },
  offline: { en: "Offline", ar: "غير متصل" },
  maintenance: { en: "Maintenance", ar: "صيانة" },
};

export function headerConnectionLabel(tone: HeaderConnectionTone, isAr: boolean): string {
  return isAr ? HEADER_CONNECTION_LABELS[tone].ar : HEADER_CONNECTION_LABELS[tone].en;
}

const HEADER_CONNECTION_DOT_CLASS: Record<HeaderConnectionTone, string> = {
  live: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.25)]",
  connecting: "bg-sky-400 animate-pulse",
  degraded: "bg-amber-400",
  offline: "bg-red-500",
  maintenance: "bg-orange-400",
};

export function headerConnectionDotClass(tone: HeaderConnectionTone): string {
  return HEADER_CONNECTION_DOT_CLASS[tone];
}

export function kitchenIdleCopy(isAr: boolean): { title: string; subtitle: string } {
  return isAr
    ? { title: "المطبخ جاهز", subtitle: "بانتظار طلبات جديدة" }
    : { title: "Kitchen Ready", subtitle: "Waiting for new orders" };
}
