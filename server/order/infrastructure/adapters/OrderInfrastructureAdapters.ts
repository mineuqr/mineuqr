import { resolveAuthoritativeOrderLines } from "../../../orderPricing";
import { generateOrderNumber } from "../../../db";
import { generateOrderTrackingToken } from "../../../orderTrackingToken";
import type {
  OrderNumberPort,
  OrderPricingPort,
  TrackingTokenPort,
} from "../../domain/ports/OrderPorts";

export const orderPricingAdapter: OrderPricingPort = {
  resolveLines: resolveAuthoritativeOrderLines,
};

export const orderNumberAdapter: OrderNumberPort = {
  allocate: generateOrderNumber,
};

export const trackingTokenAdapter: TrackingTokenPort = {
  issue: generateOrderTrackingToken,
};
