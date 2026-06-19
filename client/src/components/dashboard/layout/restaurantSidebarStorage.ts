export const RESTAURANT_SIDEBAR_STORAGE_KEY = "restaurant_dashboard_sidebar_open";

export function readRestaurantSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(RESTAURANT_SIDEBAR_STORAGE_KEY);
    if (stored === null) return true;
    return stored !== "false";
  } catch {
    return true;
  }
}

export function writeRestaurantSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(RESTAURANT_SIDEBAR_STORAGE_KEY, String(open));
  } catch {
    // ignore quota / private mode
  }
}
