/**
 * REGISTER-OPERATIONS-UI-1 — presentation barrel.
 * Consumes crmp.register.* only. No domain / financial logic.
 */

export type { RegisterOperationsLang } from "./registerOperationsCopy";
export {
  catalogStatusLabel,
  dutyStatusLabel,
  registerOperationsUiLabel,
} from "./registerOperationsCopy";
export {
  extractTrpcMessage,
  mapRegisterOperationsApiError,
  registerOperationsErrorMessage,
  type RegisterOperationsErrorKind,
} from "./registerOperationsErrorPresentation";
export {
  availabilityLabelFromDto,
  toRegisterListRowVm,
  type RegisterListRowVm,
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
