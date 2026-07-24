/**
 * REGISTER-OPERATIONS-UI / FINANCIAL-SHIFT-WORKFLOW-ADOPTION-1 —
 * presentation barrel. Consumes crmp.register.* + crmp.financialShift.*.
 * No domain / financial calculation logic.
 */

export type { RegisterOperationsLang } from "./registerOperationsCopy";
export {
  catalogStatusLabel,
  dutyStatusLabel,
  registerOperationsUiLabel,
} from "./registerOperationsCopy";
export {
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
  type RegisterOperationsErrorKind,
} from "./registerOperationsErrorPresentation";
export {
  availabilityFromCatalogStatus,
  dutyToneFromStatus,
  filterRegisterRows,
  shiftBadgeFromRef,
  toRegisterListRowVm,
  type AvailabilityBadgeTone,
  type DutyBadgeTone,
  type RegisterListRowVm,
  type ShiftBadgeTone,
} from "./registerOperationsViewModel";
export type {
  CurrentRegisterViewDto,
  FinancialShiftRefDto,
  RegisterCommandResultDto,
  RegisterDto,
  RegisterHistoryDto,
} from "./registerOperationsApiTypes";
export {
  useInvalidateRegisterOperationsQueries,
  useRegisterCurrent,
  useRegisterHistory,
  useRegisterList,
} from "./useRegisterOperationsQueries";
export {
  useRegisterOperationsMutations,
  useResolveActiveRegister,
} from "./useRegisterOperationsMutations";
export {
  useFinancialShiftCurrent,
  useFinancialShiftMutations,
  useFinancialShiftTenderSummary,
} from "./useFinancialShiftMutations";
export {
  OPS_NETWORK_BANK_METHODS,
  presentTenderSummaryRows,
  type TenderSummaryRowVm,
} from "./financialShiftTenderSummaryPresentation";
export {
  buildShiftClosingReportVm,
  computeLiveCashDifference,
  formatShiftDuration,
  printShiftClosingReport,
  readAutoPrintClosingReport,
  shortenShiftNumber,
  writeAutoPrintClosingReport,
  type ShiftClosingReportVm,
} from "./shiftClosingPresentation";
export {
  formatOpenedAtDisplay,
  formatRegisterMoneyDisplay,
  parseMoneyAmountInput,
} from "./openingFloatPresentation";
export {
  closeRequiresCashCount,
  needsOpeningFloatPrompt,
} from "./registerOperationsWorkflow";
export {
  readActiveRegister,
  rememberActiveRegister,
} from "./registerOperationsStationContext";
export {
  isCatalogActiveRegister,
  parseUserAgentFriendly,
  presentFriendlyDevice,
  presentFriendlyOperator,
  presentRoleLabel,
  resolvePrimaryDutyAction,
  resolveRegisterOpsLayoutMode,
  selectActiveRegisters,
  type FriendlyDeviceVm,
  type FriendlyOperatorVm,
  type RegisterOpsLayoutMode,
  type RegisterOpsPrimaryAction,
} from "./registerOperationsAdaptive";
