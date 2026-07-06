export type RestaurantTab =
  | "home"
  | "sessions"
  | "orders"
  | "kitchen"
  | "screens"
  /** @deprecated Use screens */
  | "devices"
  | "screen-provisioning"
  | "print"
  | "printer-management"
  | "reports"
  | "categories"
  | "offers"
  | "tables"
  | "qr"
  | "templates"
  | "settings";

export type RestaurantDashboardSection = "restaurants" | "restaurant-detail";
