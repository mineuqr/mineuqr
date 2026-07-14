/**
 * ORDERING-CLIENT-RUNTIME-1 / GOVERNANCE-1 — channel-independent in-experience navigation (ADR-ARCH-018).
 * Channels implement route mapping; the Client Platform navigates by stage.
 *
 * All stages are reachable via methods so QR / Kiosk / Waiter can map without
 * later interface breaks. Unused stages may no-op or alias channel-equivalent routes.
 */

export const ORDERING_CLIENT_STAGES = [
  "browse",
  "cart",
  "checkout",
  "confirmation",
  "tracking",
] as const;

export type OrderingClientStage = (typeof ORDERING_CLIENT_STAGES)[number];

export type OrderingNavigator = Readonly<{
  /** Current in-experience stage (presentation only). */
  stage: OrderingClientStage;
  goToBrowse: () => void;
  /**
   * Enter cart stage. QR maps to browse (cart is an overlay); kiosk/waiter may
   * use a dedicated cart route or panel.
   */
  goToCart: () => void;
  goToCheckout: () => void;
  /** Post-submit confirmation surface when distinct from live tracking. */
  goToConfirmation: (trackingToken: string) => void;
  goToTracking: (trackingToken: string) => void;
}>;
