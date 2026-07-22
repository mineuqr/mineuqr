/**
 * ORDER-SETTLEMENT-PROJECTION-1 — Check-owned Order Settlement Read Model surface.
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
