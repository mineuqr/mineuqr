/**
 * CRMP / ADR-ARCH-030 — Financial Shift Aggregate Root + owned entities.
 */

import type {
  CountKind,
  HandoverOutcome,
  MovementType,
  ShiftCloseReason,
  ShiftStatus,
} from "../valueObjects";

export type FinancialShiftId = string;
export type DrawerId = string;
export type DrawerMovementId = string;
export type DrawerCountId = string;
export type HandoverId = string;
export type AttributionId = string;

export type DrawerMovement = Readonly<{
  movementId: DrawerMovementId;
  movementType: MovementType;
  amount: string;
  currencyCode: string;
  reason: string | null;
  actorUserId: number;
  recordedAt: string;
}>;

export type DrawerCount = Readonly<{
  countId: DrawerCountId;
  kind: CountKind;
  expectedAmount: string;
  actualAmount: string;
  varianceAmount: string;
  currencyCode: string;
  actorUserId: number;
  recordedAt: string;
}>;

export type Drawer = Readonly<{
  drawerId: DrawerId;
  currencyCode: string;
  movements: readonly DrawerMovement[];
  counts: readonly DrawerCount[];
}>;

export type ShiftHandover = Readonly<{
  handoverId: HandoverId;
  initiatorUserId: number;
  receiverUserId: number;
  outcome: HandoverOutcome;
  finalCountId: string | null;
  offeredAt: string;
  resolvedAt: string | null;
}>;

export type SettlementAttributionSource =
  | "collection_fact"
  | "legacy_settlement_record";

/**
 * Settlement Attribution — association only (never owns money).
 * cashTenderAmount is a copied custody fact supplied by the caller at create time
 * (settle cash ≥ 0; refund cash return may be negative — REFUND-REGISTER-ADOPTION-1);
 * CRMP does not read Settlement Platform or Collection Fact money in this module.
 *
 * Current Cashier sales: collectionFactId is the attribution identity.
 * Historical SR-only sales and refunds: settlementRecordId is the identity.
 */
export type SettlementAttribution = Readonly<{
  attributionId: AttributionId;
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  settlementRecordId: string | null;
  collectionFactId: string | null;
  source: SettlementAttributionSource;
  operatorUserId: number;
  /** Copied cash tender total for expected-cash formula; opaque decimal. */
  cashTenderAmount: string;
  currencyCode: string;
  attributedAt: string;
}>;

export type FinancialShift = Readonly<{
  financialShiftId: FinancialShiftId;
  /**
   * HUMAN shift number — sequential, restaurant+register scoped, immutable.
   * UUID (`financialShiftId`) remains the internal identity.
   */
  shiftNumber: number;
  restaurantId: number;
  registerId: string;
  operatorUserId: number;
  status: ShiftStatus;
  openingFloatAmount: string;
  currencyCode: string;
  drawer: Drawer;
  handover: ShiftHandover | null;
  attributions: readonly SettlementAttribution[];
  version: number;
  openedAt: string;
  closedAt: string | null;
  closeReason: ShiftCloseReason | null;
  archivedAt: string | null;
  updatedAt: string;
}>;
