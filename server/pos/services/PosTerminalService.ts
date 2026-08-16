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
import { opsLog } from "../../_core/opsLog";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";
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
    private readonly entitlements: PosEntitlementService
  ) {}

  list(restaurantId: number): Promise<PosTerminal[]> {
    return this.store.listByRestaurant(restaurantId);
  }

  async register(input: {
    restaurantId: number;
    actorId: number;
    code?: string;
  }): Promise<PosTerminal> {
    const existing = input.code
      ? await this.store.getByRestaurantAndCode(input.restaurantId, input.code)
      : null;
    if (existing && existing.lifecycle !== "replaced") {
      return existing;
    }
    await this.entitlements.assertProvisioningAllowed(input.restaurantId);
    const terminal = await this.insertRegistered(input);
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
      await this.entitlements.assertProvisioningAllowed(input.restaurantId);
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
    if (!isProvisionedLifecycle(previous.lifecycle)) {
      await this.entitlements.assertProvisioningAllowed(input.restaurantId);
    }
    const replacement = await this.insertRegistered({
      restaurantId: input.restaurantId,
      actorId: input.actorId,
    });
    const marked = await this.store.updateLifecycle(previous.id, "replaced", {
      replacedByTerminalId: replacement.id,
    });
    if (!marked) throw new PosTerminalError("not_found", "Terminal not found");
    opsLog({
      type: "pos_terminal_replaced",
      category: "RUNTIME",
      severity: "info",
      ts: marked.updatedAt,
      actorId: input.actorId,
      restaurantId: input.restaurantId,
      action: "pos.terminal.replace",
      metadata: {
        previousId: marked.id,
        previousCode: marked.code,
        replacementId: replacement.id,
      },
    });
    return { previous: marked, replacement };
  }

  private async insertRegistered(input: {
    restaurantId: number;
    actorId: number;
    code?: string;
  }): Promise<PosTerminal> {
    const listed = await this.store.listByRestaurant(input.restaurantId);
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
    await this.store.insert(terminal);
    return terminal;
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
