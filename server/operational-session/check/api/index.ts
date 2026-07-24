/**
 * Check API surface barrel
 * (Order Settlement + Split Payment + Multi Check Allocation + Settlement Record).
 */

export { orderSettlementReadRouter } from "./orderSettlementReadRouter";

export { settlementRecordReadRouter } from "./settlementRecordReadRouter";
export { settlementRecordReadService } from "./settlementRecordReadService";
export { SettlementRecordReadService } from "./settlementRecordReadService";
export {
  toSettlementRecordHistoryItemDto,
  toSettlementRecordDetailDto,
  toSettlementRecordReceiptDto,
} from "./settlementRecordApiMapper";
export type {
  SettlementRecordHistoryItemDto,
  SettlementRecordHistoryPageDto,
  SettlementRecordDetailDto,
  SettlementRecordReceiptDto,
  SettlementRecordOrderRefDto,
  SettlementRecordItemSnapshotLineDto,
  SettlementRecordPaymentLineDto,
  SettlementRecordTaxLineDto,
} from "./settlementRecordApiDtos";
export {
  SETTLEMENT_RECORD_API_CONTRACT_ID,
  SETTLEMENT_RECORD_API_CONTRACT_VERSION,
} from "./settlementRecordApiDtos";
export {
  throwSettlementRecordApiError,
  runSettlementRecordRead,
} from "./mapSettlementRecordApiError";
export {
  orderSettlementReadService,
  getOrderSettlementProjectionStore,
} from "./orderSettlementReadComposition";
export { OrderSettlementReadService } from "./orderSettlementReadService";
export {
  toOrderSettlementDto,
  toOrderSettlementDtoList,
  toOrderSettlementSummaryDto,
  toProjectionCatalogDto,
  toProjectionMetaDto,
} from "./orderSettlementApiMapper";
export type {
  OrderSettlementDto,
  OrderSettlementSummaryDto,
  OrderSettlementProjectionMetaDto,
  OrderSettlementProjectionCatalogDto,
} from "./orderSettlementApiDtos";
export {
  OrderSettlementProjectionUnavailableError,
  throwOrderSettlementApiError,
  runOrderSettlementRead,
} from "./mapOrderSettlementApiError";

export { splitPaymentReadRouter } from "./splitPaymentReadRouter";
export {
  splitPaymentReadService,
  getSplitPaymentProjectionStore,
} from "./splitPaymentReadComposition";
export { SplitPaymentReadService } from "./splitPaymentReadService";
export {
  toSplitPaymentDto,
  toSplitPaymentDtoList,
  toSplitPaymentAttemptDto,
  toSplitPaymentOutstandingDto,
  toSplitPaymentSummaryDto,
  toSplitPaymentTimelineDto,
  toSplitPaymentProjectionCatalogDto,
  toSplitPaymentProjectionMetaDto,
} from "./splitPaymentApiMapper";
export {
  SPLIT_PAYMENT_API_CONTRACT_VERSION,
  SPLIT_PAYMENT_API_CONTRACT_ID,
  type SplitPaymentDto,
  type SplitPaymentAttemptDto,
  type SplitPaymentOutstandingDto,
  type SplitPaymentSummaryDto,
  type SplitPaymentTimelineDto,
  type SplitPaymentProjectionMetaDto,
  type SplitPaymentProjectionCatalogDto,
} from "./splitPaymentApiDtos";
export {
  SplitPaymentProjectionUnavailableError,
  throwSplitPaymentApiError,
  runSplitPaymentRead,
} from "./mapSplitPaymentApiError";

export { multiCheckAllocationRouter } from "./multiCheckAllocationRouter";
export {
  multiCheckAllocationReadService,
  multiCheckAllocationWriteService,
  getMultiCheckAllocationProjectionStore,
} from "./multiCheckAllocationApiComposition";
export { MultiCheckAllocationReadService } from "./multiCheckAllocationReadService";
export { MultiCheckAllocationWriteService } from "./multiCheckAllocationWriteService";
export {
  toMultiCheckAllocationDto,
  toMultiCheckAllocationDtoList,
  toMultiCheckAllocationSummaryDto,
  toMultiCheckAllocationTimelineDto,
  toMultiCheckAllocationResponsibilityDto,
  toMultiCheckAllocationProjectionCatalogDto,
  toMultiCheckAllocationCommandResultDto,
  toMultiCheckAllocationProjectionMetaDto,
} from "./multiCheckAllocationApiMapper";
export {
  MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
  MULTI_CHECK_ALLOCATION_API_CONTRACT_ID,
  type MultiCheckAllocationDto,
  type MultiCheckAllocationSummaryDto,
  type MultiCheckAllocationTimelineDto,
  type MultiCheckAllocationResponsibilityDto,
  type MultiCheckAllocationProjectionMetaDto,
  type MultiCheckAllocationProjectionCatalogDto,
  type MultiCheckAllocationCommandResultDto,
} from "./multiCheckAllocationApiDtos";
export {
  MultiCheckAllocationProjectionUnavailableError,
  throwMultiCheckAllocationApiError,
  runMultiCheckAllocationRead,
  runMultiCheckAllocationWrite,
} from "./mapMultiCheckAllocationApiError";
