export type RestaurantTab =
  | "home"
  | "sessions"
  | "orders"
  | "cashier"
  | "settlements"
  | "register"
  | "register-catalog"
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
  | "customers"
  | "qr"
  | "templates"
  | "settings";

export type RestaurantDashboardSection = "restaurants" | "restaurant-detail";
