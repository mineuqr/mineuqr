import type { RestaurantTab } from "@/components/dashboard/layout/types";
import { spaNavigate } from "@/const";

/** Tabs that use path-segment routing instead of ?section= */
const PATH_ROUTE_TABS = new Set<RestaurantTab>(["sessions"]);

export function parseDashboardRestaurantId(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function sectionToRestaurantTab(section: string | null | undefined): RestaurantTab | null {
  if (!section || section === "sessions") return null;
  if (section === "kitchen") return "screens";
  const map: Record<string, RestaurantTab> = {
    home: "home",
    orders: "orders",
    cashier: "cashier",
    settlements: "settlements",
    register: "register",
    "register-catalog": "register-catalog",
    screens: "screens",
    devices: "screens",
    "screen-provisioning": "screen-provisioning",
    print: "print",
    "printer-management": "printer-management",
    reports: "reports",
    categories: "categories",
    offers: "offers",
    tables: "tables",
    customers: "customers",
    qr: "qr",
    templates: "templates",
    settings: "settings",
  };
  return map[section] ?? null;
}

export type DashboardUrlState = {
  restaurantIdFromUrl: number | null;
  tabFromSection: RestaurantTab | null;
  needsRestaurantResolve: boolean;
  /** Legacy ?section=sessions — must redirect to /dashboard/sessions */
  legacySessionsSection: boolean;
};

export function readDashboardUrlState(pathSection: string | undefined): DashboardUrlState {
  const urlParams = new URLSearchParams(window.location.search);
  const sectionParam = urlParams.get("section");
  const pathRestaurantId =
    pathSection && /^\d+$/.test(pathSection) ? parseDashboardRestaurantId(pathSection) : null;
  const restaurantIdFromUrl =
    parseDashboardRestaurantId(urlParams.get("restaurant")) ?? pathRestaurantId;

  const legacySessionsSection = sectionParam === "sessions";
  const sessionsFromPath = pathSection === "sessions";

  let tabFromSection: RestaurantTab | null = null;
  if (sessionsFromPath || legacySessionsSection) {
    tabFromSection = "sessions";
  } else {
    const effectiveSection =
      sectionParam || (pathSection && !pathRestaurantId ? pathSection : null);
    tabFromSection = sectionToRestaurantTab(effectiveSection);
  }

  const needsRestaurantResolve = Boolean(tabFromSection && !restaurantIdFromUrl);

  return {
    restaurantIdFromUrl,
    tabFromSection,
    needsRestaurantResolve,
    legacySessionsSection,
  };
}

export function buildDashboardPath(params: {
  restaurantId?: number | null;
  section?: RestaurantTab | null;
}): string {
  if (!params.restaurantId) return "/dashboard";

  if (params.section && PATH_ROUTE_TABS.has(params.section)) {
    if (params.section === "sessions") {
      return `/dashboard/sessions?restaurant=${params.restaurantId}`;
    }
  }

  const search = new URLSearchParams();
  search.set("restaurant", String(params.restaurantId));
  if (params.section) search.set("section", params.section);
  return `/dashboard?${search.toString()}`;
}

export function syncDashboardUrl(
  params: { restaurantId?: number | null; section?: RestaurantTab | null },
  options?: { replace?: boolean }
): void {
  spaNavigate(buildDashboardPath(params), options);
}

/** Normalize legacy ?section=sessions into canonical /dashboard/sessions when possible. */
export function redirectLegacySessionsUrl(
  state: Pick<DashboardUrlState, "legacySessionsSection" | "restaurantIdFromUrl">,
  fallbackRestaurantId: number | null,
  options?: { replace?: boolean }
): boolean {
  if (!state.legacySessionsSection) return false;

  const restaurantId = state.restaurantIdFromUrl ?? fallbackRestaurantId;
  if (!restaurantId) return false;

  const canonical = buildDashboardPath({ restaurantId, section: "sessions" });
  if (window.location.pathname + window.location.search === canonical) return false;

  spaNavigate(canonical, options);
  return true;
}
