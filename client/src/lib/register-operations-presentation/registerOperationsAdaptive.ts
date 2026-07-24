/**
 * REGISTER-OPERATIONS-SIMPLIFICATION-1 — presentation-only adaptive helpers.
 * No Domain / API / business rules. Layout decisions from DTO shapes only.
 */

import type { RegisterDto } from "./registerOperationsApiTypes";
import {
  registerOperationsUiLabel,
  type RegisterOperationsLang,
} from "./registerOperationsCopy";

export type RegisterOpsLayoutMode = "simple" | "advanced";

export type RegisterOpsPrimaryAction = "open" | "close" | "resume";

export type FriendlyOperatorVm = Readonly<{
  title: string;
  subtitle: string;
  initials: string;
}>;

export type FriendlyDeviceVm = Readonly<{
  title: string;
  subtitle: string;
}>;

/** Active = catalogStatus active and not archived (archivedAt null/undefined). */
export function isCatalogActiveRegister(register: RegisterDto): boolean {
  return register.catalogStatus === "active" && register.archivedAt == null;
}

export function selectActiveRegisters(
  registers: readonly RegisterDto[]
): RegisterDto[] {
  return registers.filter(isCatalogActiveRegister);
}

/**
 * Exactly one catalog-active Register → simple layout.
 * Zero or 2+ active → advanced (or empty handling upstream).
 */
export function resolveRegisterOpsLayoutMode(
  registers: readonly RegisterDto[]
): RegisterOpsLayoutMode {
  return selectActiveRegisters(registers).length === 1 ? "simple" : "advanced";
}

/** Primary duty action visible for current duty + catalog readiness. */
export function resolvePrimaryDutyAction(input: {
  catalogStatus: RegisterDto["catalogStatus"];
  dutyStatus: RegisterDto["dutyStatus"];
}): RegisterOpsPrimaryAction | null {
  if (input.catalogStatus !== "active") return null;
  if (input.dutyStatus === "closed") return "open";
  if (input.dutyStatus === "open") return "close";
  if (input.dutyStatus === "suspended") return "resume";
  return null;
}

export function presentFriendlyOperator(input: {
  assignedOperatorUserId: number | null;
  currentUserId: number | null;
  currentUserName: string | null;
  currentUserRole: string | null;
  language: RegisterOperationsLang;
}): FriendlyOperatorVm {
  const lang = input.language;
  const name =
    input.currentUserName?.trim() ||
    registerOperationsUiLabel("currentUserFallback", lang);
  const roleLabel = presentRoleLabel(input.currentUserRole, lang);
  const initials = initialsFromName(name);

  if (input.assignedOperatorUserId == null) {
    return {
      title: registerOperationsUiLabel("operatorFollowsCurrentUser", lang),
      subtitle: `${name} · ${roleLabel}`,
      initials,
    };
  }

  if (
    input.currentUserId != null &&
    input.assignedOperatorUserId === input.currentUserId
  ) {
    return {
      title: name,
      subtitle: roleLabel,
      initials,
    };
  }

  return {
    title: registerOperationsUiLabel("operatorAssignedOther", lang),
    subtitle: registerOperationsUiLabel("operatorAssignedOtherHint", lang),
    initials: "•",
  };
}

export function presentFriendlyDevice(input: {
  deviceId: string | null;
  language: RegisterOperationsLang;
  userAgent?: string;
}): FriendlyDeviceVm {
  const lang = input.language;
  const ua =
    input.userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const { platform, browser } = parseUserAgentFriendly(ua);

  if (!input.deviceId?.trim()) {
    return {
      title: registerOperationsUiLabel("thisDevice", lang),
      subtitle: [browser, platform].filter(Boolean).join(" · "),
    };
  }

  return {
    title: registerOperationsUiLabel("currentDeviceBound", lang),
    subtitle: [browser, platform].filter(Boolean).join(" · "),
  };
}

export function presentRoleLabel(
  role: string | null | undefined,
  language: RegisterOperationsLang
): string {
  if (role === "admin") {
    return registerOperationsUiLabel("roleAdmin", language);
  }
  if (role === "user") {
    return registerOperationsUiLabel("roleManager", language);
  }
  return registerOperationsUiLabel("roleUser", language);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function parseUserAgentFriendly(ua: string): {
  platform: string;
  browser: string;
} {
  const value = ua || "";
  let platform = "Web";
  if (/windows/i.test(value)) platform = "Windows";
  else if (/android/i.test(value)) platform = "Android";
  else if (/iphone|ipad|ipod/i.test(value)) platform = "iOS";
  else if (/mac os|macintosh/i.test(value)) platform = "macOS";
  else if (/linux/i.test(value)) platform = "Linux";

  let browser = "Browser";
  if (/edg\//i.test(value)) browser = "Edge";
  else if (/chrome|crios/i.test(value) && !/edg\//i.test(value))
    browser = "Chrome";
  else if (/firefox|fxios/i.test(value)) browser = "Firefox";
  else if (/safari/i.test(value) && !/chrome|crios|android/i.test(value))
    browser = "Safari";

  return { platform, browser };
}
