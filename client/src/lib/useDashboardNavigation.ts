import type { RestaurantTab } from "@/components/dashboard/layout/types";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  parseDashboardRestaurantId,
  readDashboardUrlState,
  redirectLegacySessionsUrl,
  syncDashboardUrl,
} from "./dashboardUrl";

export const DASHBOARD_LAST_RESTAURANT_KEY = "dashboard:lastRestaurantId";

/**
 * SCREEN-PROVISIONING-NAVIGATION-1 — canonical Dashboard navigation.
 * URL (pathname + search) is the single source of truth; consumers derive state only.
 */
export function useDashboardNavigation(authResolved: boolean, isAuthenticated: boolean) {
  const [location] = useLocation();
  const search = useSearch();
  const [, routeParams] = useRoute("/dashboard/:section");

  const urlState = useMemo(
    () => readDashboardUrlState(routeParams?.section),
    [location, search, routeParams?.section]
  );

  const { restaurantIdFromUrl, tabFromSection, needsRestaurantResolve, legacySessionsSection } =
    urlState;

  const activeSection: "restaurants" | "restaurant-detail" =
    restaurantIdFromUrl || tabFromSection ? "restaurant-detail" : "restaurants";

  const selectedRestaurantId = restaurantIdFromUrl;
  const restaurantTab: RestaurantTab = tabFromSection ?? "home";

  useEffect(() => {
    redirectLegacySessionsUrl(
      { legacySessionsSection, restaurantIdFromUrl },
      parseDashboardRestaurantId(sessionStorage.getItem(DASHBOARD_LAST_RESTAURANT_KEY)),
      { replace: true }
    );
  }, [legacySessionsSection, restaurantIdFromUrl, location, search]);

  const { data: restaurants, isLoading: restaurantsResolving } = trpc.restaurant.list.useQuery(
    undefined,
    { enabled: authResolved && isAuthenticated && needsRestaurantResolve }
  );

  useEffect(() => {
    if (!needsRestaurantResolve || !restaurants?.length) return;
    const storedId = parseDashboardRestaurantId(
      sessionStorage.getItem(DASHBOARD_LAST_RESTAURANT_KEY)
    );
    const resolvedId =
      storedId && restaurants.some((r) => r.id === storedId) ? storedId : restaurants[0].id;
    const section = tabFromSection ?? "home";
    syncDashboardUrl({ restaurantId: resolvedId, section }, { replace: true });
  }, [needsRestaurantResolve, restaurants, tabFromSection]);

  useEffect(() => {
    if (selectedRestaurantId) {
      sessionStorage.setItem(DASHBOARD_LAST_RESTAURANT_KEY, String(selectedRestaurantId));
    }
  }, [selectedRestaurantId]);

  const navigateToRestaurant = useCallback((id: number) => {
    sessionStorage.setItem(DASHBOARD_LAST_RESTAURANT_KEY, String(id));
    syncDashboardUrl({ restaurantId: id, section: "home" });
  }, []);

  const navigateToRestaurantsList = useCallback(() => {
    syncDashboardUrl({});
  }, []);

  const navigateToTab = useCallback((tab: RestaurantTab) => {
    const restaurantId = parseDashboardRestaurantId(
      new URLSearchParams(window.location.search).get("restaurant")
    );
    if (restaurantId) {
      syncDashboardUrl({ restaurantId, section: tab }, { replace: true });
    }
  }, []);

  return {
    activeSection,
    selectedRestaurantId,
    restaurantTab,
    needsRestaurantResolve,
    restaurantsResolving,
    navigateToRestaurant,
    navigateToRestaurantsList,
    navigateToTab,
  };
}
