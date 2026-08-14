/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 */

import type { PlatformOwnerAccessMode } from "../db/schema/platformOwnerAccess";

export type { PlatformOwnerAccessMode };

export type OwnerAccessModeRecord = {
  ownerOpenId: string;
  mode: PlatformOwnerAccessMode;
  simulatedPlanCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OwnerAccessModeState =
  | {
      ok: true;
      persisted: boolean;
      mode: "FULL_PLATFORM";
      simulatedPlanCode: null;
    }
  | {
      ok: true;
      persisted: boolean;
      mode: "SIMULATED_PLAN";
      simulatedPlanCode: string;
    }
  | {
      ok: false;
      reason: "invalid_persisted_state";
      mode: string;
      simulatedPlanCode: string | null;
    };

export const DEFAULT_OWNER_ACCESS_STATE: Extract<
  OwnerAccessModeState,
  { ok: true; mode: "FULL_PLATFORM" }
> = {
  ok: true,
  persisted: false,
  mode: "FULL_PLATFORM",
  simulatedPlanCode: null,
};
