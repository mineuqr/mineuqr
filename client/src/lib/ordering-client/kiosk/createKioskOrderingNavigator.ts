/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — Kiosk OrderingNavigator (+ shell stage helpers).
 * Maps Client Platform stages to kiosk routes. Idle/language/reset are channel shell.
 */
import type {
  OrderingClientStage,
  OrderingNavigator,
} from "../contracts/OrderingNavigator";
import { KIOSK_ORDERING_ROUTES } from "@/lib/ordering-platform/kioskOrderingChannelContract";

export type KioskShellStage =
  | "idle"
  | "language"
  | OrderingClientStage
  | "resetting";

export type KioskOrderingNavigator = OrderingNavigator &
  Readonly<{
    goToIdle: () => void;
    goToLanguage: () => void;
    /** Channel reset → idle (after isolation wipe). */
    goToResetIdle: () => void;
  }>;

export type CreateKioskOrderingNavigatorInput = Readonly<{
  slug: string;
  stage: OrderingClientStage | "idle" | "language";
  setLocation: (path: string, options?: { replace?: boolean }) => void;
  /** Preserved channel query (station / kiosk device). */
  querySuffix?: string;
  /**
   * KIOSK-SCREEN-ACTIVATION-1 — when hosted by Screen Runtime, stage transitions
   * update host state instead of navigating `/kiosk/:slug` URLs.
   */
  onHostStageNavigate?: (
    stage: KioskShellStage,
    extras?: { trackingToken?: string }
  ) => void;
}>;

function path(template: string, slug: string): string {
  return template.replace(":slug", slug);
}

function withQuery(base: string, querySuffix?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams(
    querySuffix?.startsWith("?") ? querySuffix.slice(1) : querySuffix || ""
  );
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function createKioskOrderingNavigator(
  input: CreateKioskOrderingNavigatorInput
): KioskOrderingNavigator {
  const { slug, stage, setLocation, querySuffix, onHostStageNavigate } = input;
  const platformStage: OrderingClientStage =
    stage === "idle" || stage === "language" ? "browse" : stage;

  const browsePath = path(KIOSK_ORDERING_ROUTES.menu, slug);
  const cartPath = path(KIOSK_ORDERING_ROUTES.cart, slug);
  const checkoutPath = path(KIOSK_ORDERING_ROUTES.checkout, slug);
  const idlePath = path(KIOSK_ORDERING_ROUTES.idle, slug);
  const languagePath = path(KIOSK_ORDERING_ROUTES.language, slug);
  const confirmedPath = path(KIOSK_ORDERING_ROUTES.confirmation, slug);

  const go = (
    hostStage: KioskShellStage,
    url: string,
    options?: { replace?: boolean; trackingToken?: string }
  ) => {
    if (onHostStageNavigate) {
      onHostStageNavigate(hostStage, { trackingToken: options?.trackingToken });
      return;
    }
    setLocation(url, options?.replace ? { replace: true } : undefined);
  };

  return {
    stage: platformStage,
    goToBrowse: () => go("browse", withQuery(browsePath, querySuffix)),
    goToCart: () => go("cart", withQuery(cartPath, querySuffix)),
    goToCheckout: () => go("checkout", withQuery(checkoutPath, querySuffix)),
    goToConfirmation: (trackingToken: string) =>
      go("confirmation", withQuery(confirmedPath, querySuffix, { token: trackingToken }), {
        replace: true,
        trackingToken,
      }),
    // Kiosk has no live tracking surface — alias confirmation.
    goToTracking: (trackingToken: string) =>
      go("confirmation", withQuery(confirmedPath, querySuffix, { token: trackingToken }), {
        replace: true,
        trackingToken,
      }),
    goToIdle: () => go("idle", withQuery(idlePath, querySuffix), { replace: true }),
    goToLanguage: () => go("language", withQuery(languagePath, querySuffix)),
    goToResetIdle: () => go("idle", withQuery(idlePath, querySuffix), { replace: true }),
  };
}

export function resolveKioskOrderingStage(
  pathName: string
): OrderingClientStage | "idle" | "language" {
  if (pathName.includes("/confirmed")) return "confirmation";
  if (pathName.includes("/checkout")) return "checkout";
  if (pathName.includes("/cart")) return "cart";
  if (pathName.includes("/menu")) return "browse";
  if (pathName.includes("/language")) return "language";
  return "idle";
}
