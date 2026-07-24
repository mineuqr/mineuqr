/**
 * SETTLEMENT-ATTRIBUTION-ADOPTION-1 — collected SettlementAttributed fact.
 * No bus / outbox. Consumers key on claimKey.
 */

import type { SettlementAttribution } from "./financialShiftContract";

export type SettlementAttributed = Readonly<{
  eventType: "SettlementAttributed";
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  settlementRecordId: string;
  attributionId: string;
  operatorUserId: number;
  cashTenderAmount: string;
  currencyCode: string;
  version: number;
  occurredAt: string;
  claimKey: string;
  alreadyApplied: boolean;
}>;

export function buildSettlementAttributedEvent(input: {
  attribution: SettlementAttribution;
  shiftVersion: number;
  occurredAt: string;
  alreadyApplied: boolean;
}): SettlementAttributed {
  return {
    eventType: "SettlementAttributed",
    restaurantId: input.attribution.restaurantId,
    registerId: input.attribution.registerId,
    financialShiftId: input.attribution.financialShiftId,
    settlementRecordId: input.attribution.settlementRecordId,
    attributionId: input.attribution.attributionId,
    operatorUserId: input.attribution.operatorUserId,
    cashTenderAmount: input.attribution.cashTenderAmount,
    currencyCode: input.attribution.currencyCode,
    version: input.shiftVersion,
    occurredAt: input.occurredAt,
    alreadyApplied: input.alreadyApplied,
    claimKey: `${input.attribution.settlementRecordId}:SettlementAttributed`,
  };
}
