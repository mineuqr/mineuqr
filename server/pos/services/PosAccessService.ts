/**
 * POS-TERMINAL-ACCESS-IMPLEMENTATION-1
 * Server-authoritative terminal access. Owner/admin ≠ cashier.
 */

import type {
  PosAccessContext,
  PosAccessDecision,
  PosPermission,
  PosRestaurantScopeKind,
} from "@shared/pos";
import { opsLog } from "../../_core/opsLog";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import type { PosTerminalStore } from "../infrastructure/PosTerminalStore";
import { PosEntitlementService } from "./PosEntitlementService";
import { PosTerminalError } from "./PosTerminalService";

export type { PosPermissionGrant } from "../infrastructure/PosPermissionGrantStore";

export class PosAccessService {
  constructor(
    private readonly store: PosTerminalStore,
    private readonly grants: PosPermissionGrantStore,
    private readonly entitlements: PosEntitlementService
  ) {}

  async listPermissions(
    userId: number,
    restaurantId: number
  ): Promise<readonly PosPermission[]> {
    const rows = await this.grants.listByRestaurantUser(restaurantId, userId);
    return rows.map((row) => row.permission);
  }

  async hasGrant(
    userId: number,
    restaurantId: number,
    permission: PosPermission
  ): Promise<boolean> {
    return this.grants.hasGrant(restaurantId, userId, permission);
  }

  async grant(input: {
    restaurantId: number;
    userId: number;
    permission: PosPermission;
    actorId: number;
  }): Promise<{ grant: { userId: number; restaurantId: number; permission: PosPermission }; created: boolean }> {
    const existed = await this.grants.hasGrant(
      input.restaurantId,
      input.userId,
      input.permission
    );
    const grant = await this.grants.upsert({
      restaurantId: input.restaurantId,
      userId: input.userId,
      permission: input.permission,
    });
    if (!existed) {
      opsLog({
        type: "pos_permission_granted",
        category: "RUNTIME",
        severity: "info",
        ts: new Date().toISOString(),
        actorId: input.actorId,
        restaurantId: input.restaurantId,
        action: "pos.access.grant",
        metadata: { userId: input.userId, permission: input.permission },
      });
    }
    return { grant, created: !existed };
  }

  async revoke(input: {
    restaurantId: number;
    userId: number;
    permission: PosPermission;
    actorId: number;
  }): Promise<{ removed: boolean }> {
    const removed = await this.grants.remove(
      input.restaurantId,
      input.userId,
      input.permission
    );
    if (removed) {
      opsLog({
        type: "pos_permission_revoked",
        category: "RUNTIME",
        severity: "info",
        ts: new Date().toISOString(),
        actorId: input.actorId,
        restaurantId: input.restaurantId,
        action: "pos.access.revoke",
        metadata: { userId: input.userId, permission: input.permission },
      });
    }
    return { removed };
  }

  async resolvePosTerminalAccess(input: {
    restaurantId: number;
    terminalId: string;
    userId: number;
    requiredPermission: PosPermission;
    restaurantScope: PosRestaurantScopeKind;
  }): Promise<PosAccessDecision> {
    const decision = await this.evaluate(input);
    if (!decision.allowed) {
      opsLog({
        type: "pos_access_denied",
        category: "RUNTIME",
        severity: "info",
        ts: new Date().toISOString(),
        actorId: input.userId,
        restaurantId: input.restaurantId,
        action: "pos.access.resolve",
        metadata: {
          terminalId: input.terminalId,
          reasonCode: decision.reasonCode,
          requiredPermission: input.requiredPermission,
        },
      });
    }
    return decision;
  }

  /** Phase 1 compatibility — lifecycle + explicit grant only. */
  async authorize(input: {
    restaurantId: number;
    terminalId: string;
    userId: number;
    permission: PosPermission;
  }): Promise<PosAccessDecision> {
    const terminal = await this.store.getById(input.terminalId);
    if (!terminal || terminal.restaurantId !== input.restaurantId) {
      throw new PosTerminalError("not_found", "Terminal not found");
    }
    if (terminal.lifecycle !== "active") {
      return { allowed: false, reasonCode: "terminal_inactive" };
    }
    if (!(await this.hasGrant(input.userId, input.restaurantId, input.permission))) {
      return { allowed: false, reasonCode: "pos_permission_denied" };
    }
    return { allowed: true, reasonCode: "granted" };
  }

  private async evaluate(input: {
    restaurantId: number;
    terminalId: string;
    userId: number;
    requiredPermission: PosPermission;
    restaurantScope: PosRestaurantScopeKind;
  }): Promise<PosAccessDecision> {
    const terminal = await this.store.getById(input.terminalId);
    if (!terminal) {
      return { allowed: false, reasonCode: "terminal_not_found" };
    }
    if (terminal.restaurantId !== input.restaurantId) {
      return { allowed: false, reasonCode: "terminal_foreign" };
    }
    if (terminal.lifecycle !== "active") {
      return { allowed: false, reasonCode: "terminal_inactive" };
    }
    const [entitlement, permissions] = await Promise.all([
      this.entitlements.resolve(input.restaurantId),
      this.listPermissions(input.userId, input.restaurantId),
    ]);
    if (!entitlement.available) {
      return { allowed: false, reasonCode: "entitlement_unavailable" };
    }
    if (!permissions.includes(input.requiredPermission)) {
      return { allowed: false, reasonCode: "pos_permission_denied" };
    }
    const context: PosAccessContext = {
      userId: input.userId,
      restaurantId: input.restaurantId,
      terminalId: terminal.id,
      permissions,
      restaurantScope: input.restaurantScope,
    };
    return { allowed: true, reasonCode: "granted", context };
  }
}
