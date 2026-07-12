import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { roleSupportsRuntimeDensityAndCategoryFilter } from "./screenSettingsRuntimeMessaging";

/** SCREEN-MANAGEMENT-UX-1A — operator-facing fleet filters (Revision B). */
export type OperatorFleetFilter = "all" | "online" | "offline" | "needs_attention";

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
