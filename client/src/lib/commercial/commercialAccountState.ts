/**
 * COMMERCIAL-FROZEN-ACCOUNT-STATE-1 — client presentation helpers.
 * Not authorization. Server FROZEN guard is authoritative.
 */

export const FROZEN_RENEWAL_PATH = "/pricing";

export type ClientCommercialAccountState = "ACTIVE" | "FROZEN" | "NONE";

export function readCommercialAccountState(
  meta: { commercialAccountState?: string } | null | undefined
): ClientCommercialAccountState | null {
  const state = meta?.commercialAccountState;
  if (state === "ACTIVE" || state === "FROZEN" || state === "NONE") return state;
  return null;
}

export function isFrozenCommercialAccount(
  meta: { commercialAccountState?: string } | null | undefined
): boolean {
  return readCommercialAccountState(meta) === "FROZEN";
}

export function isCommercialManagementPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "";
  return (
    path === "/dashboard" ||
    path.startsWith("/dashboard/") ||
    path === "/statistics"
  );
}

export function resolvePostAuthPath(input: {
  accountState: ClientCommercialAccountState | null;
  requestedPath: string;
}): string {
  if (input.accountState === "FROZEN" && isCommercialManagementPath(input.requestedPath)) {
    return FROZEN_RENEWAL_PATH;
  }
  return input.requestedPath;
}
