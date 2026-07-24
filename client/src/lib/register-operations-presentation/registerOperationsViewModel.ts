/**
 * REGISTER-OPERATIONS-UI-1 — presentation mapping only (no business rules).
 */

import type { RegisterDto } from "./registerOperationsApiTypes";
import {
  catalogStatusLabel,
  dutyStatusLabel,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";

export type RegisterListRowVm = Readonly<{
  registerId: string;
  displayName: string;
  dutyLabel: string;
  catalogLabel: string;
  availabilityLabel: string;
  dutyStatus: RegisterDto["dutyStatus"];
  catalogStatus: RegisterDto["catalogStatus"];
  operatorLabel: string;
  deviceLabel: string;
}>;

/** Map API catalog/duty fields to display labels — no invented state. */
export function availabilityLabelFromDto(
  register: Pick<RegisterDto, "catalogStatus" | "dutyStatus">,
  language: RegisterOperationsLang
): string {
  if (register.catalogStatus !== "active") {
    return registerOperationsUiLabel("not_available", language);
  }
  if (register.dutyStatus === "open") {
    return registerOperationsUiLabel("on_duty", language);
  }
  if (register.dutyStatus === "suspended") {
    return registerOperationsUiLabel("duty_paused", language);
  }
  return registerOperationsUiLabel("available_for_duty", language);
}

export function toRegisterListRowVm(
  register: RegisterDto,
  language: RegisterOperationsLang
): RegisterListRowVm {
  return {
    registerId: register.registerId,
    displayName: register.displayName,
    dutyLabel: dutyStatusLabel(register.dutyStatus, language),
    catalogLabel: catalogStatusLabel(register.catalogStatus, language),
    availabilityLabel: availabilityLabelFromDto(register, language),
    dutyStatus: register.dutyStatus,
    catalogStatus: register.catalogStatus,
    operatorLabel:
      register.assignedOperatorUserId != null
        ? String(register.assignedOperatorUserId)
        : registerOperationsUiLabel("none", language),
    deviceLabel:
      register.deviceId?.trim() || registerOperationsUiLabel("none", language),
  };
}
