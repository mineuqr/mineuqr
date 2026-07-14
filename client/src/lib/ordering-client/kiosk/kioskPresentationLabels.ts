/**
 * KIOSK-PRESENTATION-ADOPTION-1 — customer/staff-facing kiosk labels.
 * Technical deviceId (dev_*) remains internal and must not be rendered here.
 */

export const KIOSK_CUSTOMER_FACING_LABEL_AR = "طلب ذاتي";
export const KIOSK_CUSTOMER_FACING_LABEL_EN = "Self-Order";

/** Stable cart/station scope key — never a raw deviceId. */
export const KIOSK_DEFAULT_STATION_SCOPE = "kiosk";

export function kioskCustomerFacingLabel(isAr: boolean): string {
  return isAr ? KIOSK_CUSTOMER_FACING_LABEL_AR : KIOSK_CUSTOMER_FACING_LABEL_EN;
}
