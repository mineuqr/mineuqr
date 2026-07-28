/**
 * OPERATIONAL-ORDER-CARD-PLATFORM-1
 * Official MineuQR Operational Order Card Platform — public barrel.
 *
 * Presentation infrastructure only. Feature modules own workflow / APIs / events.
 * Data input SSOT: OrderPresentationModel (@/lib/order-presentation).
 */
export {
  resolveOperationalOrderDensity,
  type OperationalOrderDensity,
  type OperationalOrderDensityTokens,
} from "./tokens/density";

export {
  OPERATIONAL_ORDER_HIERARCHY,
  type OperationalOrderHierarchySlot,
} from "./tokens/hierarchy";

export {
  OperationalOrderCard,
  type OperationalOrderCardProps,
} from "./components/OperationalOrderCard";
export { OperationalOrderHeader } from "./components/OperationalOrderHeader";
export { OperationalOrderStatus } from "./components/OperationalOrderStatus";
export { OperationalOrderTimeline } from "./components/OperationalOrderTimeline";
export { OperationalOrderItems } from "./components/OperationalOrderItems";
export { OperationalOrderItem } from "./components/OperationalOrderItem";
export { OperationalOrderQuantity } from "./components/OperationalOrderQuantity";
export { OperationalOrderModifiers } from "./components/OperationalOrderModifiers";
export { OperationalOrderNotes } from "./components/OperationalOrderNotes";
export { OperationalOrderPriority } from "./components/OperationalOrderPriority";
export { OperationalOrderDelay } from "./components/OperationalOrderDelay";
export { OperationalOrderFooter } from "./components/OperationalOrderFooter";
export { OperationalOrderActions } from "./components/OperationalOrderActions";

export {
  mapWaiterOrderPresentation,
  mapDashboardOrderPresentation,
  type WaiterOrderPresentationSource,
  type DashboardOrderPresentationSource,
} from "./adapters/presentationAdapters";
