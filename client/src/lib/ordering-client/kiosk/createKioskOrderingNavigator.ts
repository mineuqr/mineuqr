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
  const { slug, stage, setLocation, querySuffix } = input;
  const platformStage: OrderingClientStage =
    stage === "idle" || stage === "language" ? "browse" : stage;

  const browsePath = path(KIOSK_ORDERING_ROUTES.menu, slug);
  const cartPath = path(KIOSK_ORDERING_ROUTES.cart, slug);
  const checkoutPath = path(KIOSK_ORDERING_ROUTES.checkout, slug);
  const idlePath = path(KIOSK_ORDERING_ROUTES.idle, slug);
  const languagePath = path(KIOSK_ORDERING_ROUTES.language, slug);
  const confirmedPath = path(KIOSK_ORDERING_ROUTES.confirmation, slug);

  return {
    stage: platformStage,
    goToBrowse: () => setLocation(withQuery(browsePath, querySuffix)),
    goToCart: () => setLocation(withQuery(cartPath, querySuffix)),
    goToCheckout: () => setLocation(withQuery(checkoutPath, querySuffix)),
    goToConfirmation: (trackingToken: string) =>
      setLocation(
        withQuery(confirmedPath, querySuffix, { token: trackingToken }),
        { replace: true }
      ),
    // Kiosk has no live tracking surface — alias confirmation.
    goToTracking: (trackingToken: string) =>
      setLocation(
        withQuery(confirmedPath, querySuffix, { token: trackingToken }),
        { replace: true }
      ),
    goToIdle: () =>
      setLocation(withQuery(idlePath, querySuffix), { replace: true }),
    goToLanguage: () => setLocation(withQuery(languagePath, querySuffix)),
    goToResetIdle: () =>
      setLocation(withQuery(idlePath, querySuffix), { replace: true }),
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
