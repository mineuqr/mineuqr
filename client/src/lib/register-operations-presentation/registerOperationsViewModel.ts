/**
 * REGISTER-OPERATIONS-UI-UX-REFINEMENT-1 — presentation mapping only.
 * Maps certified API enum/null fields to display labels — no invented state.
 */

import type { RegisterDto } from "./registerOperationsApiTypes";
import {
  catalogStatusLabel,
  dutyStatusLabel,
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";
import type { CurrentShiftPresentationKind } from "./registerOperationsWorkflow";
import { formatOpsShiftNumber } from "./shiftClosingPresentation";

export type DutyBadgeTone = "open" | "suspended" | "closed";
export type AvailabilityBadgeTone = "ready" | "unavailable";
export type ShiftBadgeTone = "active" | "none" | "pending" | "error";

export type RegisterListRowVm = Readonly<{
  registerId: string;
  displayName: string;
  dutyStatus: RegisterDto["dutyStatus"];
  dutyLabel: string;
  dutyTone: DutyBadgeTone;
  catalogStatus: RegisterDto["catalogStatus"];
  catalogLabel: string;
  /** Presentation of catalogStatus only: active → ready, else unavailable. */
  availabilityTone: AvailabilityBadgeTone;
  availabilityLabel: string;
  operatorLabel: string;
  deviceLabel: string;
  searchText: string;
}>;

/** Duty badge tone = backend dutyStatus (1:1). */
export function dutyToneFromStatus(
  duty: RegisterDto["dutyStatus"]
): DutyBadgeTone {
  return duty;
}

/**
 * Availability badge from catalogStatus only (backend field).
 * active → جاهز / Ready; otherwise غير متاح / Unavailable.
 */
export function availabilityFromCatalogStatus(
  catalogStatus: RegisterDto["catalogStatus"],
  language: RegisterOperationsLang
): { tone: AvailabilityBadgeTone; label: string } {
  if (catalogStatus === "active") {
    return {
      tone: "ready",
      label: registerOperationsUiLabel("ready", language),
    };
  }
  return {
    tone: "unavailable",
    label: registerOperationsUiLabel("unavailable", language),
  };
}

/** Shift badge from presentation/query-state (not a boolean collapse). */
export function presentCurrentShiftBadge(
  kind: CurrentShiftPresentationKind,
  language: RegisterOperationsLang,
  shiftNumber?: number | null
): { tone: ShiftBadgeTone; label: string } {
  if (kind === "unknown") {
    return {
      tone: "pending",
      label: registerOperationsUiLabel("shiftDetermining", language),
    };
  }
  if (kind === "error") {
    return {
      tone: "error",
      label: registerOperationsUiLabel("shiftUnavailable", language),
    };
  }
  if (kind === "active") {
    const formatted = formatOpsShiftNumber(shiftNumber);
    const active = registerOperationsUiLabel("shiftActive", language);
    if (formatted !== "—") {
      return { tone: "active", label: `${active} — #${formatted}` };
    }
    return { tone: "active", label: active };
  }
  return {
    tone: "none",
    label: registerOperationsUiLabel("noShift", language),
  };
}

/** @deprecated Prefer presentCurrentShiftBadge — boolean presence only. */
export function shiftBadgeFromRef(
  hasShift: boolean,
  language: RegisterOperationsLang
): { tone: ShiftBadgeTone; label: string } {
  return presentCurrentShiftBadge(hasShift ? "active" : "none", language);
}

export function toRegisterListRowVm(
  register: RegisterDto,
  language: RegisterOperationsLang
): RegisterListRowVm {
  const availability = availabilityFromCatalogStatus(
    register.catalogStatus,
    language
  );
  const operatorLabel =
    register.assignedOperatorUserId != null
      ? registerOperationsUiLabel("operatorAssignedOther", language)
      : registerOperationsUiLabel("operatorFollowsCurrentUser", language);
  const deviceLabel = register.deviceId?.trim()
    ? registerOperationsUiLabel("currentDeviceBound", language)
    : registerOperationsUiLabel("thisDevice", language);
  return {
    registerId: register.registerId,
    displayName: register.displayName,
    dutyStatus: register.dutyStatus,
    dutyLabel: dutyStatusLabel(register.dutyStatus, language),
    dutyTone: dutyToneFromStatus(register.dutyStatus),
    catalogStatus: register.catalogStatus,
    catalogLabel: catalogStatusLabel(register.catalogStatus, language),
    availabilityTone: availability.tone,
    availabilityLabel: availability.label,
    operatorLabel,
    deviceLabel,
    searchText: [
      register.displayName,
      dutyStatusLabel(register.dutyStatus, language),
      registerOperationsUiLabel(`catalog_${register.catalogStatus}`, language),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function filterRegisterRows(
  rows: readonly RegisterListRowVm[],
  query: string
): RegisterListRowVm[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((row) => row.searchText.includes(q));
}
