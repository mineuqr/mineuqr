/**
 * Check-owned Read Model surface (Order Settlement + Split Payment projections).
 */

export {
  InMemoryOrderSettlementProjectionStore,
  type OrderSettlementProjectionStore,
} from "./orderSettlementProjectionStore";

export {
  materializeOrderSettlementProjections,
  tryMaterializeOrderSettlementProjections,
  type OrderSettlementProjectionMaterializeInput,
  type OrderSettlementProjectionMaterializeResult,
} from "./orderSettlementProjectionMaterializer";

export {
  InMemorySplitPaymentProjectionStore,
  type SplitPaymentProjectionStore,
} from "./splitPaymentProjectionStore";

export {
  materializeSplitPaymentProjections,
  tryMaterializeSplitPaymentProjections,
  type SplitPaymentProjectionMaterializeInput,
  type SplitPaymentProjectionMaterializeResult,
} from "./splitPaymentProjectionMaterializer";
