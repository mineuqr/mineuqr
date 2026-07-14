/**
 * ORDERING-CLIENT-RUNTIME-1 — channel-independent in-experience navigation (ADR-ARCH-018).
 * Channels implement route mapping; the Client Platform navigates by stage.
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
  goToCheckout: () => void;
  goToTracking: (trackingToken: string) => void;
}>;
