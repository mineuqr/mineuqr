/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Load / mutate owner access mode. Never writes subscriptions or bindings.
 */

import { OPS_EVENT } from "../_core/opsTaxonomy";
import { opsLog } from "../_core/opsLog";
import { invalidateEntitlementCache } from "../subscription-runtime/cache";
import {
  DEFAULT_OWNER_ACCESS_STATE,
  type OwnerAccessModeState,
  type PlatformOwnerAccessMode,
} from "./types";
import { readOwnerAccessRecord, writeOwnerAccessRecord } from "./store";
import { getCurrentLivePlanCompositionByCode } from "./livePlanComposition";

export function interpretOwnerAccessRecord(
  record: {
    mode: string;
    simulatedPlanCode: string | null;
  } | null
): OwnerAccessModeState {
  if (!record) return DEFAULT_OWNER_ACCESS_STATE;
  if (record.mode === "FULL_PLATFORM") {
    if (record.simulatedPlanCode != null) {
      return {
        ok: false,
        reason: "invalid_persisted_state",
        mode: record.mode,
        simulatedPlanCode: record.simulatedPlanCode,
      };
    }
    return {
      ok: true,
      persisted: true,
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
    };
  }
  if (record.mode === "SIMULATED_PLAN") {
    const code = record.simulatedPlanCode?.trim() ?? "";
    if (!code) {
      return {
        ok: false,
        reason: "invalid_persisted_state",
        mode: record.mode,
        simulatedPlanCode: record.simulatedPlanCode,
      };
    }
    return {
      ok: true,
      persisted: true,
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: code,
    };
  }
  return {
    ok: false,
    reason: "invalid_persisted_state",
    mode: record.mode,
    simulatedPlanCode: record.simulatedPlanCode,
  };
}

export async function loadOwnerAccessMode(
  ownerOpenId: string
): Promise<OwnerAccessModeState> {
  const record = await readOwnerAccessRecord(ownerOpenId);
  return interpretOwnerAccessRecord(record);
}

export async function persistOwnerAccessMode(input: {
  ownerOpenId: string;
  ownerUserId: number;
  mode: PlatformOwnerAccessMode;
  simulatedPlanCode: string | null;
  previous: OwnerAccessModeState;
  correlationId?: string;
  procedure?: string;
}): Promise<OwnerAccessModeState> {
  if (input.mode === "FULL_PLATFORM" && input.simulatedPlanCode != null) {
    throw new Error("FULL_PLATFORM requires simulatedPlanCode = null");
  }
  if (input.mode === "SIMULATED_PLAN") {
    const code = input.simulatedPlanCode?.trim() ?? "";
    if (!code) {
      throw new Error("SIMULATED_PLAN requires a Live Plan code");
    }
    const composition = await getCurrentLivePlanCompositionByCode(code);
    if (!composition) {
      throw new Error(`SIMULATION_UNAVAILABLE:${code}`);
    }
    input = { ...input, simulatedPlanCode: composition.catalogPlanCode };
  }

  await writeOwnerAccessRecord({
    ownerOpenId: input.ownerOpenId,
    mode: input.mode,
    simulatedPlanCode: input.mode === "FULL_PLATFORM" ? null : input.simulatedPlanCode,
  });
  invalidateEntitlementCache(input.ownerUserId);

  opsLog({
    type: OPS_EVENT.owner_access_mode_changed,
    category: "ADMIN",
    severity: "info",
    ts: new Date().toISOString(),
    actorId: input.ownerUserId,
    correlationId: input.correlationId,
    procedure: input.procedure ?? "ownerAccess.setMode",
    action: "owner_access_mode_changed",
    metadata: {
      ownerOpenIdPrefix: input.ownerOpenId.slice(0, 8),
      previousMode: input.previous.ok ? input.previous.mode : input.previous.reason,
      previousSimulatedPlanCode: input.previous.ok
        ? input.previous.simulatedPlanCode
        : input.previous.simulatedPlanCode,
      newMode: input.mode,
      newSimulatedPlanCode:
        input.mode === "SIMULATED_PLAN" ? input.simulatedPlanCode : null,
    },
  });

  return loadOwnerAccessMode(input.ownerOpenId);
}
