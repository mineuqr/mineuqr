/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter OrderingNavigator.
 * Maps Client Platform stages to waiter routes. Tables/login are channel shell.
 */
import type {
  OrderingClientStage,
  OrderingNavigator,
} from "../contracts/OrderingNavigator";
import { WAITER_ORDERING_ROUTES } from "@/lib/ordering-platform/waiterOrderingChannelContract";

export type WaiterShellStage =
  | "tables"
  | OrderingClientStage;

export type WaiterOrderingNavigator = OrderingNavigator &
  Readonly<{
    goToTables: () => void;
  }>;

export type CreateWaiterOrderingNavigatorInput = Readonly<{
  slug: string;
  stage: WaiterShellStage;
  setLocation: (path: string, options?: { replace?: boolean }) => void;
  /** Preserved channel query (table / session). */
  querySuffix?: string;
}>;

function path(template: string, slug: string): string {
  return template.replace(":slug", slug);
}

function withQuery(
  base: string,
  querySuffix?: string,
  extra?: Record<string, string>
) {
  const params = new URLSearchParams(
    querySuffix?.startsWith("?") ? querySuffix.slice(1) : querySuffix || ""
  );
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function createWaiterOrderingNavigator(
  input: CreateWaiterOrderingNavigatorInput
): WaiterOrderingNavigator {
  const { slug, stage, setLocation, querySuffix } = input;
  const platformStage: OrderingClientStage =
    stage === "tables" ? "browse" : stage;

  const tablesPath = path(WAITER_ORDERING_ROUTES.tables, slug);
  const browsePath = path(WAITER_ORDERING_ROUTES.menu, slug);
  const cartPath = path(WAITER_ORDERING_ROUTES.cart, slug);
  const checkoutPath = path(WAITER_ORDERING_ROUTES.checkout, slug);
  const confirmedPath = path(WAITER_ORDERING_ROUTES.confirmation, slug);

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
    goToTracking: (trackingToken: string) =>
      setLocation(
        withQuery(confirmedPath, querySuffix, { token: trackingToken }),
        { replace: true }
      ),
    goToTables: () => setLocation(withQuery(tablesPath, querySuffix)),
  };
}

export function resolveWaiterOrderingStage(
  pathName: string
): WaiterShellStage {
  if (pathName.includes("/confirmed")) return "confirmation";
  if (pathName.includes("/checkout")) return "checkout";
  if (pathName.includes("/cart")) return "cart";
  if (pathName.includes("/menu")) return "browse";
  return "tables";
}
