/**
 * POS-REGISTER-SHIFT-IMPLEMENTATION-1
 * Thin POS consumer of existing CRMP Register / Financial Shift.
 * POS does not own Register, Shift, cashbox, or cash movements.
 */

import type { SettlementContext } from "@shared/crmp";
import { resolveSettlementContextForSettle } from "../../crmp/SettlementContextResolver";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";

export class PosRegisterShiftContextError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosRegisterShiftContextError";
    this.code = code;
  }
}

export type PosRegisterShiftHints = {
  restaurantId: number;
  operatorUserId: number;
  deviceId?: string | null;
};

export type PosCanonicalRegisterShift = {
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  operatorUserId: number;
  deviceId: string | null;
  status: "resolved";
};

export type PosSettlementContextResolve = (
  input: PosRegisterShiftHints & { restaurantId: number }
) => Promise<SettlementContext>;

export type PosTerminalDeviceLookup = (input: {
  restaurantId: number;
  terminalId: string;
}) => Promise<string | null>;

function defaultTerminalDeviceLookup(
  store: PosTerminalStore
): PosTerminalDeviceLookup {
  return async ({ restaurantId, terminalId }) => {
    const terminal = await store.getById(terminalId);
    if (!terminal || terminal.restaurantId !== restaurantId) return null;
    return terminal.optionalDeviceId;
  };
}

export function mapSettlementContextToPosError(
  context: SettlementContext,
  restaurantId: number
): PosRegisterShiftContextError | null {
  if (context.restaurantId !== restaurantId) {
    return new PosRegisterShiftContextError(
      "register_wrong_restaurant",
      "Register does not belong to this restaurant"
    );
  }
  if (context.gaps.includes("register_duty_closed")) {
    return new PosRegisterShiftContextError(
      "register_closed",
      "Register is not open"
    );
  }
  if (context.gaps.includes("register_not_active")) {
    return new PosRegisterShiftContextError(
      "register_closed",
      "Register is not active"
    );
  }
  if (!context.registerId) {
    return new PosRegisterShiftContextError(
      "register_required",
      "An open Register is required"
    );
  }
  if (
    context.gaps.includes("no_active_shift") ||
    context.gaps.includes("no_active_shift_for_operator") ||
    !context.financialShiftId
  ) {
    return new PosRegisterShiftContextError(
      "shift_required",
      "An open Financial Shift is required"
    );
  }
  if (context.status !== "resolved" || context.operatorUserId == null) {
    return new PosRegisterShiftContextError(
      "register_required",
      "Register/Shift context is not resolved"
    );
  }
  return null;
}

export function requireCanonicalRegisterShift(
  context: SettlementContext,
  restaurantId: number
): PosCanonicalRegisterShift {
  const err = mapSettlementContextToPosError(context, restaurantId);
  if (err) throw err;
  return {
    restaurantId: context.restaurantId,
    registerId: context.registerId!,
    financialShiftId: context.financialShiftId!,
    operatorUserId: context.operatorUserId!,
    deviceId: context.deviceId,
    status: "resolved",
  };
}

export class PosRegisterShiftContextService {
  constructor(
    private readonly resolveContext: PosSettlementContextResolve = resolveSettlementContextForSettle,
    private readonly terminalDeviceLookup: PosTerminalDeviceLookup = async () =>
      null
  ) {}

  static withTerminalStore(
    store: PosTerminalStore,
    resolveContext: PosSettlementContextResolve = resolveSettlementContextForSettle
  ): PosRegisterShiftContextService {
    return new PosRegisterShiftContextService(
      resolveContext,
      defaultTerminalDeviceLookup(store)
    );
  }

  async resolveRaw(input: PosRegisterShiftHints): Promise<SettlementContext> {
    return this.resolveContext({
      restaurantId: input.restaurantId,
      operatorUserId: input.operatorUserId,
      deviceId: input.deviceId ?? null,
    });
  }

  async resolveForTerminal(input: {
    restaurantId: number;
    terminalId: string;
    operatorUserId: number;
  }): Promise<SettlementContext> {
    const deviceId = await this.terminalDeviceLookup({
      restaurantId: input.restaurantId,
      terminalId: input.terminalId,
    });
    return this.resolveRaw({
      restaurantId: input.restaurantId,
      operatorUserId: input.operatorUserId,
      deviceId,
    });
  }

  /**
   * PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1
   * One CRMP resolve for the Cashier Confirm gate. Caller forwards
   * `settlementContext` into confirmPayment so finalize does not resolve again.
   */
  async requireResolvedContextForSettlement(input: {
    restaurantId: number;
    terminalId: string;
    operatorUserId: number;
  }): Promise<{
    operational: PosCanonicalRegisterShift;
    settlementContext: SettlementContext;
  }> {
    const settlementContext = await this.resolveForTerminal(input);
    return {
      operational: requireCanonicalRegisterShift(
        settlementContext,
        input.restaurantId
      ),
      settlementContext,
    };
  }

  async requireForSettlement(input: {
    restaurantId: number;
    terminalId: string;
    operatorUserId: number;
  }): Promise<PosCanonicalRegisterShift> {
    const { operational } = await this.requireResolvedContextForSettlement(
      input
    );
    return operational;
  }
}
