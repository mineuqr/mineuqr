/**
 * POS-CASHIER-CRMP-OPERATIONS-1
 * Thin POS adapter over existing CRMP Register / Financial Shift operations.
 * POS does not own cashier identity, Register, Shift, or cash movements.
 */

import { createHash } from "node:crypto";
import {
  getCrmpFinancialShiftOperationsService,
  getCrmpRegisterOperationsService,
} from "../../crmp/api/crmpApiComposition";
import type { CrmpFinancialShiftOperationsService } from "../../crmp/api/crmpFinancialShiftOperationsService";
import type { CrmpRegisterOperationsService } from "../../crmp/api/crmpRegisterOperationsService";
import { CrmpConflictError, CrmpNotFoundError } from "@shared/crmp";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";
import { PosAccessService } from "./PosAccessService";
import type { SelectUser } from "../../../drizzle/schema";
import type { PosPermission } from "@shared/pos";

export class PosCashierCrmpError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosCashierCrmpError";
    this.code = code;
  }
}

const AUTH_DENIED_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
]);

export type PosCashierCrmpCommandBase = {
  restaurantId: number;
  terminalId: string;
  registerId: string;
};

function mapCrmpError(err: unknown): never {
  if (err instanceof PosCashierCrmpError) throw err;
  if (err instanceof CrmpNotFoundError) {
    throw new PosCashierCrmpError("register_not_found", "Register not found");
  }
  if (err instanceof CrmpConflictError) {
    throw new PosCashierCrmpError(
      "concurrency_conflict",
      "Register/Shift operation conflicted"
    );
  }
  throw err;
}

function financialShiftIdForRetry(input: {
  restaurantId: number;
  terminalId: string;
  userId: number;
  registerId: string;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        restaurantId: input.restaurantId,
        terminalId: input.terminalId,
        userId: input.userId,
        registerId: input.registerId,
        idempotencyKey: input.idempotencyKey,
      })
    )
    .digest("hex")
    .slice(0, 32);
  return `fsh_${digest}`;
}

export class PosCashierCrmpOperationsService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly terminals: PosTerminalStore,
    private readonly registers: CrmpRegisterOperationsService = getCrmpRegisterOperationsService(),
    private readonly shifts: CrmpFinancialShiftOperationsService = getCrmpFinancialShiftOperationsService()
  ) {}

  private async authorize(input: {
    user: SelectUser;
    restaurantId: number;
    terminalId: string;
    requiredPermission: PosPermission;
    action: string;
  }) {
    const scope = await assertRestaurantPosScope(
      { user: input.user },
      input.restaurantId,
      this.grants,
      input.action
    );
    const decision = await this.access.resolvePosTerminalAccess({
      restaurantId: input.restaurantId,
      terminalId: input.terminalId,
      userId: input.user.id,
      requiredPermission: input.requiredPermission,
      restaurantScope: scope.kind,
    });
    if (!decision.allowed || !decision.context) {
      throw new PosCashierCrmpError(
        AUTH_DENIED_CODES.has(decision.reasonCode)
          ? decision.reasonCode
          : "pos_permission_denied",
        "غير مصرح بالوصول"
      );
    }
    const context = decision.context;
    if (
      !context.permissions.includes("POS_ACCESS") ||
      !context.permissions.includes(input.requiredPermission)
    ) {
      throw new PosCashierCrmpError("pos_permission_denied", "غير مصرح بالوصول");
    }
    return context;
  }

  private async assertRegisterForTerminal(input: {
    restaurantId: number;
    terminalId: string;
    registerId: string;
  }) {
    if (!input.registerId.trim()) {
      throw new PosCashierCrmpError("register_not_found", "Register not found");
    }
    const register = await this.registers.get({
      restaurantId: input.restaurantId,
      registerId: input.registerId,
    });
    if (register.restaurantId !== input.restaurantId) {
      throw new PosCashierCrmpError(
        "register_wrong_restaurant",
        "Register does not belong to this restaurant"
      );
    }
    const terminal = await this.terminals.getById(input.terminalId);
    if (!terminal || terminal.restaurantId !== input.restaurantId) {
      throw new PosCashierCrmpError("terminal_not_found", "Terminal not found");
    }
    if (
      terminal.optionalDeviceId &&
      register.deviceId &&
      terminal.optionalDeviceId !== register.deviceId
    ) {
      throw new PosCashierCrmpError(
        "register_terminal_mismatch",
        "Register is not bound to this terminal"
      );
    }
    return register;
  }

  async openRegister(input: {
    user: SelectUser;
    command: PosCashierCrmpCommandBase;
  }) {
    const context = await this.authorize({
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      requiredPermission: "SHIFT_OPEN",
      action: "pos.cashier.register.open",
    });
    try {
      await this.assertRegisterForTerminal({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        registerId: input.command.registerId,
      });
      const result = await this.registers.open({
        restaurantId: context.restaurantId,
        registerId: input.command.registerId,
        operatorUserId: context.userId,
      });
      return {
        register: result.register,
        alreadyApplied: result.alreadyApplied,
        cashierUserId: context.userId,
        terminalId: context.terminalId,
      };
    } catch (err) {
      mapCrmpError(err);
    }
  }

  async closeRegister(input: {
    user: SelectUser;
    command: PosCashierCrmpCommandBase;
  }) {
    const context = await this.authorize({
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      requiredPermission: "SHIFT_CLOSE",
      action: "pos.cashier.register.close",
    });
    try {
      await this.assertRegisterForTerminal({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        registerId: input.command.registerId,
      });
      const result = await this.registers.close({
        restaurantId: context.restaurantId,
        registerId: input.command.registerId,
      });
      return {
        register: result.register,
        alreadyApplied: result.alreadyApplied,
        cashierUserId: context.userId,
        terminalId: context.terminalId,
      };
    } catch (err) {
      mapCrmpError(err);
    }
  }

  async openShift(input: {
    user: SelectUser;
    command: PosCashierCrmpCommandBase & {
      openingFloatAmount: string;
      currencyCode: string;
      idempotencyKey: string;
    };
  }) {
    const context = await this.authorize({
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      requiredPermission: "SHIFT_OPEN",
      action: "pos.cashier.financialShift.open",
    });
    if (
      !input.command.idempotencyKey.trim() ||
      input.command.idempotencyKey.length < 8 ||
      input.command.idempotencyKey.length > 128
    ) {
      throw new PosCashierCrmpError(
        "invalid_idempotency_key",
        "Idempotency key is required"
      );
    }
    try {
      await this.assertRegisterForTerminal({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        registerId: input.command.registerId,
      });
      const result = await this.shifts.open({
        restaurantId: context.restaurantId,
        registerId: input.command.registerId,
        operatorUserId: context.userId,
        openingFloatAmount: input.command.openingFloatAmount,
        currencyCode: input.command.currencyCode,
        financialShiftId: financialShiftIdForRetry({
          restaurantId: context.restaurantId,
          terminalId: context.terminalId,
          userId: context.userId,
          registerId: input.command.registerId,
          idempotencyKey: input.command.idempotencyKey,
        }),
      });
      return {
        shift: result.shift,
        alreadyApplied: result.alreadyApplied,
        cashierUserId: context.userId,
        terminalId: context.terminalId,
      };
    } catch (err) {
      mapCrmpError(err);
    }
  }

  async closeShift(input: {
    user: SelectUser;
    command: PosCashierCrmpCommandBase & {
      actualCashAmount: string;
      financialShiftId?: string;
    };
  }) {
    const context = await this.authorize({
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      requiredPermission: "SHIFT_CLOSE",
      action: "pos.cashier.financialShift.close",
    });
    try {
      await this.assertRegisterForTerminal({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        registerId: input.command.registerId,
      });
      const current = await this.shifts.getCurrent({
        restaurantId: context.restaurantId,
        registerId: input.command.registerId,
      });
      if (!current) {
        throw new PosCashierCrmpError(
          "shift_required",
          "An open Financial Shift is required"
        );
      }
      if (
        input.command.financialShiftId &&
        input.command.financialShiftId !== current.financialShiftId
      ) {
        throw new PosCashierCrmpError(
          "shift_mismatch",
          "Shift does not match the active Register"
        );
      }
      const result = await this.shifts.close({
        restaurantId: context.restaurantId,
        financialShiftId: current.financialShiftId,
        actualCashAmount: input.command.actualCashAmount,
        actorUserId: context.userId,
      });
      return {
        shift: result.shift,
        alreadyApplied: result.alreadyApplied,
        cashierUserId: context.userId,
        terminalId: context.terminalId,
      };
    } catch (err) {
      mapCrmpError(err);
    }
  }
}
