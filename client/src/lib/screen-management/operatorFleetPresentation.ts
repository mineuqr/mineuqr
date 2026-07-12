import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { roleSupportsRuntimeDensityAndCategoryFilter } from "./screenSettingsRuntimeMessaging";

/** SCREEN-MANAGEMENT-UX-1A/1B — operator-facing fleet filters (Revision B). */
export type OperatorFleetFilter = "all" | "online" | "offline" | "needs_attention";

/** Single presentation model for Online / Offline / Needs attention (UX-1B). */
export type OperatorFleetStatusKind = "online" | "offline" | "needs_attention" | "never_seen";

export const OPERATOR_FLEET_FILTER_PRESETS: Array<{
  id: OperatorFleetFilter;
  labelEn: string;
  labelAr: string;
}> = [
  { id: "all", labelEn: "All", labelAr: "الكل" },
  { id: "online", labelEn: "Online", labelAr: "متصل" },
  { id: "offline", labelEn: "Offline", labelAr: "غير متصل" },
  { id: "needs_attention", labelEn: "Needs attention", labelAr: "يحتاج انتباه" },
];

export function screenNeedsAttention(screen: FleetScreenReadModel): boolean {
  const { canonicalState, healthSummary } = screen;
  if (healthSummary.presence === "never_seen") return true;
  if (!healthSummary.hasActiveToken) return true;
  if (canonicalState.maintenanceState === "maintenance") return true;
  if (canonicalState.operationalState === "blocked") return true;
  if (screen.businessReadiness === "pairing_required") return true;
  return false;
}

/**
 * Resolves the primary operator-visible status for a screen.
 * Needs attention takes precedence over Online/Offline when both apply.
 */
export function resolveOperatorFleetStatus(screen: FleetScreenReadModel): OperatorFleetStatusKind {
  if (screenNeedsAttention(screen)) {
    return screen.healthSummary.presence === "never_seen" ? "never_seen" : "needs_attention";
  }
  if (screen.healthSummary.presence === "online") return "online";
  if (screen.healthSummary.presence === "offline") return "offline";
  return "never_seen";
}

export function operatorFleetStatusLabel(
  kind: OperatorFleetStatusKind,
  language: string
): string {
  const isAr = language === "ar";
  switch (kind) {
    case "online":
      return isAr ? "متصل" : "Online";
    case "offline":
      return isAr ? "غير متصل" : "Offline";
    case "needs_attention":
      return isAr ? "يحتاج انتباه" : "Needs attention";
    case "never_seen":
      return isAr ? "لم يتصل بعد" : "Not yet connected";
    default:
      return kind;
  }
}

/** Tailwind class tokens for status pills — shared by cards, table, filters. */
export function operatorFleetStatusPillClass(kind: OperatorFleetStatusKind): string {
  switch (kind) {
    case "online":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "offline":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
    case "needs_attention":
      return "bg-amber-500/20 text-amber-900 dark:text-amber-100";
    case "never_seen":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function formatLastSeen(
  lastHeartbeat: string | null,
  language: string
): string {
  const isAr = language === "ar";
  if (!lastHeartbeat) return isAr ? "لم يتصل بعد" : "Not yet connected";
  return new Date(lastHeartbeat).toLocaleString(isAr ? "ar-SA" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function matchesOperatorFleetFilter(
  screen: FleetScreenReadModel,
  filter: OperatorFleetFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "online") return screen.healthSummary.presence === "online";
  if (filter === "offline") return screen.healthSummary.presence === "offline";
  if (filter === "needs_attention") return screenNeedsAttention(screen);
  return true;
}

export function countNeedsAttention(screens: FleetScreenReadModel[]): number {
  return screens.filter(screenNeedsAttention).length;
}

export function formatCategorySummary(
  role: FleetScreenReadModel["role"],
  visibleCategoryIds: number[] | undefined,
  categoryNameById: Map<number, string>,
  isAr: boolean
): string | null {
  if (!roleSupportsRuntimeDensityAndCategoryFilter(role)) return null;
  if (!visibleCategoryIds || visibleCategoryIds.length === 0) {
    return isAr ? "كل الأصناف" : "All items";
  }
  if (visibleCategoryIds.length === 1) {
    const name = categoryNameById.get(visibleCategoryIds[0]!);
    return name ?? (isAr ? "فئة واحدة" : "1 category");
  }
  return isAr
    ? `${visibleCategoryIds.length} فئات`
    : `${visibleCategoryIds.length} categories`;
}
