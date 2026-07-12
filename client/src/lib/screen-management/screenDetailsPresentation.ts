import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";

/** SCREEN-MANAGEMENT-UX-1C — tab identifiers for the Screen Details workspace. */
export type ScreenDetailsTab = "display" | "access" | "diagnostics";

export const SCREEN_DETAILS_TABS: ScreenDetailsTab[] = ["display", "access", "diagnostics"];

export function screenDetailsTabLabel(tab: ScreenDetailsTab, language: string): string {
  const isAr = language === "ar";
  switch (tab) {
    case "display":
      return isAr ? "العرض" : "Display";
    case "access":
      return isAr ? "الوصول" : "Access";
    case "diagnostics":
      return isAr ? "التشخيص" : "Diagnostics";
    default:
      return tab;
  }
}

/** Maps manage-menu actions to the tab that should open in Screen Details. */
export function resolveDetailsTabFromManageAction(
  action: FleetScreenManageAction
): ScreenDetailsTab {
  if (action === "diagnostics") return "diagnostics";
  return "access";
}

/** Access-tab focus derived from manage-menu actions (diagnostics opens its own tab). */
export function resolveAccessFocusFromManageAction(
  action: FleetScreenManageAction
): FleetScreenManageAction | null {
  if (action === "diagnostics") return null;
  return action;
}
