/**
 * ORDER-SETTLEMENT-PROJECTION-1 — pure Read Model contracts + builders.
 * No persistence, repositories, buses, or Aggregate mutation.
 */

export {
  ORDER_SETTLEMENT_PROJECTION_PROGRAM_ID,
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  ORDER_SETTLEMENT_PROJECTION_ID,
  type OrderSettlementProjection,
  type OrderSettlementProjectionIdentity,
  type OrderSettlementProjectionEventClaimKey,
} from "./orderSettlementProjectionContract";

export {
  buildOrderSettlementProjection,
  buildOrderSettlementProjections,
  buildOrderSettlementProjectionRevision,
  buildOrderSettlementProjectionEventClaimKey,
} from "./orderSettlementProjectionBuilder";
