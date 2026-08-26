/**
 * REGISTER-OPERATIONS-SHIFT-ROTATION-STATE-FIX-1
 * Presentation-only current-shift cache reconciliation.
 * financialShift.getCurrent is authoritative for "is there an active shift".
 */

export type CurrentShiftSnapshot = Readonly<{
  financialShiftId: string;
  registerId: string;
  restaurantId: number;
  status: string;
  version: number;
  openedAt: string;
}>;

const recentlyClosedShiftByRegister = new Map<string, string>();

function registerKey(restaurantId: number, registerId: string): string {
  return `${restaurantId}:${registerId}`;
}

export function isAuthoritativeCurrentShift(
  shift: CurrentShiftSnapshot | null | undefined
): shift is CurrentShiftSnapshot {
  if (shift == null) return false;
  return shift.status !== "closed" && shift.status !== "archived";
}

export function markRegisterShiftClosed(
  restaurantId: number,
  registerId: string,
  financialShiftId: string
): void {
  recentlyClosedShiftByRegister.set(
    registerKey(restaurantId, registerId),
    financialShiftId
  );
}

export function markRegisterShiftOpened(
  restaurantId: number,
  registerId: string
): void {
  recentlyClosedShiftByRegister.delete(registerKey(restaurantId, registerId));
}

export function recentlyClosedShiftId(
  restaurantId: number,
  registerId: string
): string | undefined {
  return recentlyClosedShiftByRegister.get(registerKey(restaurantId, registerId));
}

/**
 * Merge a fetched/in-flight current-shift result with cache.
 * Rejects cross-restaurant/register writes and resurrection of a just-closed shift.
 */
export function reconcileIncomingCurrentShift(input: {
  restaurantId: number;
  registerId: string;
  cached: CurrentShiftSnapshot | null | undefined;
  incoming: CurrentShiftSnapshot | null | undefined;
}): CurrentShiftSnapshot | null {
  const closedId = recentlyClosedShiftId(input.restaurantId, input.registerId);
  const cached =
    isAuthoritativeCurrentShift(input.cached) &&
    input.cached.financialShiftId !== closedId
      ? input.cached
      : null;
  const incoming = normalizeIncoming(input.incoming, input.restaurantId, input.registerId);
  const incomingCurrent =
    incoming &&
    isAuthoritativeCurrentShift(incoming) &&
    incoming.financialShiftId !== closedId
      ? incoming
      : null;

  if (cached && !incomingCurrent) {
    return cached;
  }
  if (cached && incomingCurrent) {
    if (cached.financialShiftId !== incomingCurrent.financialShiftId) {
      return cached.openedAt >= incomingCurrent.openedAt
        ? cached
        : incomingCurrent;
    }
    return cached.version >= incomingCurrent.version ? cached : incomingCurrent;
  }
  return incomingCurrent;
}

/** Close-without-shift must not use a stale local null as authority. */
export function decideRegisterDutyCloseWithoutShift(
  current: CurrentShiftSnapshot | null | undefined
): { action: "block" } | { action: "close_duty" } {
  if (isAuthoritativeCurrentShift(current)) {
    return { action: "block" };
  }
  return { action: "close_duty" };
}

export function resetRegisterShiftRotationMarksForTests(): void {
  recentlyClosedShiftByRegister.clear();
}

export function readCurrentShiftSnapshot(
  value: unknown
): CurrentShiftSnapshot | null {
  if (value == null || typeof value !== "object") return null;
  if (
    !("financialShiftId" in value) ||
    !("registerId" in value) ||
    !("restaurantId" in value) ||
    !("status" in value) ||
    !("version" in value) ||
    !("openedAt" in value)
  ) {
    return null;
  }
  if (typeof value.financialShiftId !== "string") return null;
  if (typeof value.registerId !== "string") return null;
  if (typeof value.restaurantId !== "number") return null;
  if (typeof value.status !== "string") return null;
  if (typeof value.version !== "number") return null;
  if (typeof value.openedAt !== "string") return null;
  return {
    financialShiftId: value.financialShiftId,
    registerId: value.registerId,
    restaurantId: value.restaurantId,
    status: value.status,
    version: value.version,
    openedAt: value.openedAt,
  };
}

function normalizeIncoming(
  incoming: CurrentShiftSnapshot | null | undefined,
  restaurantId: number,
  registerId: string
): CurrentShiftSnapshot | null {
  if (incoming == null) return null;
  if (
    incoming.restaurantId !== restaurantId ||
    incoming.registerId !== registerId
  ) {
    return null;
  }
  return incoming;
}
