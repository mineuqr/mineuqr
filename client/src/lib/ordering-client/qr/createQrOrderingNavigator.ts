/**
 * ORDERING-CLIENT-RUNTIME-1 — QR OrderingNavigator backed by wouter paths.
 */
import type {
  OrderingClientStage,
  OrderingNavigator,
} from "../contracts/OrderingNavigator";

export type CreateQrOrderingNavigatorInput = Readonly<{
  slug: string;
  tableNumber: number;
  stage: OrderingClientStage;
  setLocation: (path: string, options?: { replace?: boolean }) => void;
}>;

export function createQrOrderingNavigator(
  input: CreateQrOrderingNavigatorInput
): OrderingNavigator {
  const { slug, tableNumber, stage, setLocation } = input;
  const browsePath = `/menu/${slug}/table/${tableNumber}`;
  const checkoutPath = `/menu/${slug}/table/${tableNumber}/checkout`;

  return {
    stage,
    goToBrowse: () => setLocation(browsePath),
    goToCheckout: () => setLocation(checkoutPath),
    goToTracking: (trackingToken: string) =>
      setLocation(`/menu/${slug}/order/${trackingToken}`, { replace: true }),
  };
}

export function resolveQrOrderingStage(isCheckout: boolean): OrderingClientStage {
  return isCheckout ? "checkout" : "browse";
}
