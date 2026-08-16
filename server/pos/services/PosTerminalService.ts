/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
 * POS Terminal lifecycle. Does not own money, devices, or registers.
 */

import { randomUUID } from "node:crypto";
import {
  isProvisionedLifecycle,
  nextPosTerminalCode,
  type PosTerminal,
} from "@shared/pos";
import { POS_TERMINALS_LIMIT_KEY } from "@shared/commercial-catalog/contracts";
import { opsLog } from "../../_core/opsLog";
import { getRestaurantById } from "../../db";
import { requireRestaurantRowForUpdate, RestaurantGoneError } from "../../db/restaurantRowLock";
import { checkLimit } from "../../subscription-runtime";
import {
  withCommercialLimitOccupancy,
  type CommercialOccupancyTx,
} from "../../subscription-runtime/commercialLimitOccupancy";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";
import { PosTerminalCodeConflictError } from "../infrastructure/posPersistenceErrors";
import { PosEntitlementDeniedError, PosEntitlementService } from "./PosEntitlementService";

export class PosTerminalError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosTerminalError";
    this.code = code;
  }
}

export class PosTerminalService {
  constructor(
    private readonly store: PosTerminalStore,
    entitlements: PosEntitlementService
  ) {
    void entitlements;
  }

  list(restaurantId: number): Promise<PosTerminal[]> {
    return this.store.listByRestaurant(restaurantId);
  }

  async register(input: {
    restaurantId: number;
    actorId: number;
    code?: string;
  }): Promise<PosTerminal> {
    const requestedCode = input.code;
    const existing = requestedCode
      ? await this.store.getByRestaurantAndCode(
          input.restaurantId,
          requestedCode
        )
      : null;
    if (existing && existing.lifecycle !== "replaced") {
      return existing;
    }
    const terminal = await this.consumeProvisionedSlot(
      input.restaurantId,
      (tx) => this.insertRegistered(input, tx),
      requestedCode
        ? async (tx) => {
            const found = await this.store.getByRestaurantAndCode(
              input.restaurantId,
              requestedCode,
              tx
            );
            if (found && found.lifecycle !== "replaced") return found;
            return null;
          }
        : undefined
    );
    opsLog({
      type: "pos_terminal_registered",
      category: "RUNTIME",
      severity: "info",
      ts: terminal.createdAt,
      actorId: input.actorId,
      restaurantId: input.restaurantId,
      action: "pos.terminal.register",
      metadata: { terminalId: terminal.id, code: terminal.code },
    });
    return terminal;
  }

  async activate(input: {
    restaurantId: number;
    terminalId: string;
    actorId: number;
  }): Promise<PosTerminal> {
    const terminal = await this.requireOwned(input.restaurantId, input.terminalId);
    if (terminal.lifecycle === "active") return terminal;
    if (terminal.lifecycle === "replaced") {
      throw new PosTerminalError("terminal_replaced", "Replaced terminal cannot be activated");
    }
    if (terminal.lifecycle === "deactivated") {
      const next = await this.consumeProvisionedSlot(
        input.restaurantId,
        async (tx) => {
          const updated = await this.store.updateLifecycle(
            terminal.id,
            "active",
            undefined,
            tx
          );
          if (!updated) throw new PosTerminalError("not_found", "Terminal not found");
          return updated;
        }
      );
      opsLog({
        type: "pos_terminal_activated",
        category: "RUNTIME",
        severity: "info",
        ts: next.updatedAt,
        actorId: input.actorId,
        restaurantId: input.restaurantId,
        action: "pos.terminal.activate",
        metadata: { terminalId: next.id },
      });
      return next;
    }
    const next = await this.store.updateLifecycle(terminal.id, "active");
    if (!next) throw new PosTerminalError("not_found", "Terminal not found");
    opsLog({
      type: "pos_terminal_activated",
      category: "RUNTIME",
      severity: "info",
      ts: next.updatedAt,
      actorId: input.actorId,
      restaurantId: input.restaurantId,
      action: "pos.terminal.activate",
      metadata: { terminalId: next.id },
    });
    return next;
  }

  async deactivate(input: {
    restaurantId: number;
    terminalId: string;
    actorId: number;
  }): Promise<PosTerminal> {
    const terminal = await this.requireOwned(input.restaurantId, input.terminalId);
    if (terminal.lifecycle === "replaced") {
      throw new PosTerminalError("terminal_replaced", "Replaced terminal cannot be deactivated");
    }
    if (terminal.lifecycle === "deactivated") return terminal;
    const next = await this.store.updateLifecycle(terminal.id, "deactivated");
    if (!next) throw new PosTerminalError("not_found", "Terminal not found");
    opsLog({
      type: "pos_terminal_deactivated",
      category: "RUNTIME",
      severity: "info",
      ts: next.updatedAt,
      actorId: input.actorId,
      restaurantId: input.restaurantId,
      action: "pos.terminal.deactivate",
      metadata: { terminalId: next.id },
    });
    return next;
  }

  async replace(input: {
    restaurantId: number;
    terminalId: string;
    actorId: number;
  }): Promise<{ previous: PosTerminal; replacement: PosTerminal }> {
    const previous = await this.requireOwned(input.restaurantId, input.terminalId);
    if (previous.lifecycle === "replaced") {
      throw new PosTerminalError("already_replaced", "Terminal already replaced");
    }
    const occupancyDelta: 0 | 1 = isProvisionedLifecycle(previous.lifecycle)
      ? 0
      : 1;
    const performReplace = async (tx: CommercialOccupancyTx | null) => {
      const current = await this.store.getById(previous.id, tx);
      if (!current || current.restaurantId !== input.restaurantId) {
        throw new PosTerminalError("not_found", "Terminal not found");
      }
      if (current.lifecycle === "replaced") {
        throw new PosTerminalError("already_replaced", "Terminal already replaced");
      }
      const lockedDelta: 0 | 1 = isProvisionedLifecycle(current.lifecycle)
        ? 0
        : 1;
      if (lockedDelta !== occupancyDelta) {
        throw new PosTerminalError(
          "lifecycle_conflict",
          "Terminal lifecycle changed during replacement"
        );
      }
      const replacement = await this.insertRegistered(
        {
          restaurantId: input.restaurantId,
          actorId: input.actorId,
        },
        tx
      );
      const marked = await this.store.updateLifecycle(
        current.id,
        "replaced",
        { replacedByTerminalId: replacement.id },
        tx
      );
      if (!marked) throw new PosTerminalError("not_found", "Terminal not found");
      return { previous: marked, replacement };
    };
    const result = await this.consumeProvisionedSlot(
      input.restaurantId,
      performReplace,
      undefined,
      occupancyDelta
    );
    opsLog({
      type: "pos_terminal_replaced",
      category: "RUNTIME",
      severity: "info",
      ts: result.previous.updatedAt,
      actorId: input.actorId,
      restaurantId: input.restaurantId,
      action: "pos.terminal.replace",
      metadata: {
        previousId: result.previous.id,
        previousCode: result.previous.code,
        replacementId: result.replacement.id,
      },
    });
    return result;
  }

  private async consumeProvisionedSlot<T>(
    restaurantId: number,
    create: (tx: CommercialOccupancyTx | null) => Promise<T>,
    resolveExisting?: (tx: CommercialOccupancyTx | null) => Promise<T | null>,
    occupancyDelta: 0 | 1 = 1
  ): Promise<T> {
    const restaurant = await getRestaurantById(restaurantId);
    if (!restaurant) {
      throw new PosEntitlementDeniedError("restaurant_not_found");
    }
    return await withCommercialLimitOccupancy({
      scope: {
        kind: "restaurant",
        scopeId: restaurantId,
        ownerUserId: restaurant.userId,
      },
      limitKey: POS_TERMINALS_LIMIT_KEY,
      occupancyDelta,
      decide: (proposedTotal) =>
        checkLimit({
          ownerId: restaurant.userId,
          limitKey: POS_TERMINALS_LIMIT_KEY,
          proposedTotal,
        }),
      countOccupancy: async (tx) => {
        if (tx) {
          try {
            await requireRestaurantRowForUpdate(tx, restaurantId);
          } catch (error) {
            if (error instanceof RestaurantGoneError) {
              throw new PosEntitlementDeniedError("restaurant_not_found");
            }
            throw error;
          }
        }
        const listed = await this.store.listByRestaurant(restaurantId, tx);
        return listed.filter((row) => isProvisionedLifecycle(row.lifecycle))
          .length;
      },
      resolveExisting,
      create,
    });
  }

  private async insertRegistered(
    input: {
      restaurantId: number;
      actorId: number;
      code?: string;
    },
    tx?: CommercialOccupancyTx | null
  ): Promise<PosTerminal> {
    const listed = await this.store.listByRestaurant(input.restaurantId, tx);
    const code = input.code ?? nextPosTerminalCode(listed.map((t) => t.code));
    const now = new Date().toISOString();
    const terminal: PosTerminal = {
      id: randomUUID(),
      restaurantId: input.restaurantId,
      code,
      lifecycle: "registered",
      replacedByTerminalId: null,
      optionalDeviceId: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.store.insert(terminal, tx);
      return terminal;
    } catch (error) {
      if (!(error instanceof PosTerminalCodeConflictError)) throw error;
      const winner = await this.store.getByRestaurantAndCode(
        input.restaurantId,
        code,
        tx
      );
      if (!winner) throw error;
      return winner;
    }
  }

  async requireOwned(restaurantId: number, terminalId: string): Promise<PosTerminal> {
    const terminal = await this.store.getById(terminalId);
    if (!terminal || terminal.restaurantId !== restaurantId) {
      throw new PosTerminalError("not_found", "Terminal not found");
    }
    return terminal;
  }
}

export { PosEntitlementDeniedError };
