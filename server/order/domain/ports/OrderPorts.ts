import type { OrderLineInput, ResolvedOrderLine } from "../../../orderPricing";

export type OrderPricingPort = {
  resolveLines(
    restaurantId: number,
    items: OrderLineInput[]
  ): Promise<{ lines: ResolvedOrderLine[]; totalAmount: string }>;
};

export type OrderNumberPort = {
  allocate(restaurantId: number): Promise<string>;
};

export type TrackingTokenPort = {
  issue(): string;
};
