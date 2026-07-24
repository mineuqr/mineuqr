/**
 * REGISTER-OPERATIONS-UI — presentation barrel.
 * Consumes crmp.register.* only. No domain / financial logic.
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
