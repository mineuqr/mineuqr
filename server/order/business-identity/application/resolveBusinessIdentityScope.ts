/**
 * KIOSK-PRESENTATION-ADOPTION-1 / WAITER-ORDERING-FOUNDATION-1 —
 * map fulfilment stamps (or explicit scope) to Business Identity scope.
 * Single identity system; scopes partition the daily sequence only.
 */

export const BUSINESS_IDENTITY_SCOPES = ["TABLE", "KIOSK", "WAITER"] as const;
export type BusinessIdentityScope = (typeof BUSINESS_IDENTITY_SCOPES)[number];

export function resolveBusinessIdentityScope(input: {
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
  identityScope?: string | null;
}): BusinessIdentityScope {
  const explicit = input.identityScope?.trim().toUpperCase();
  if (explicit === "TABLE" || explicit === "KIOSK" || explicit === "WAITER") {
    return explicit;
  }

  const anchor = input.fulfilmentAnchorType?.trim();
  const mode = input.serviceMode?.trim();

  if (anchor === "table" || mode === "table_service") {
    return "TABLE";
  }

  if (
    anchor === "station" ||
    mode === "counter" ||
    mode === "take_away" ||
    mode === "pickup" ||
    mode === "queue" ||
    mode === "drive_thru"
  ) {
    return "KIOSK";
  }

  // QR / historic default — preserve table sequence continuity.
  return "TABLE";
}

export function businessIdentityScopeCode(
  scope: BusinessIdentityScope
): "T" | "K" | "WT" {
  if (scope === "KIOSK") return "K";
  if (scope === "WAITER") return "WT";
  return "T";
}
