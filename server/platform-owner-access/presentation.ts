/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Server presentation of owner access mode. Server remains authoritative.
 */

import {
  getCurrentLivePlanCompositionByCode,
  listCurrentLivePlansForSimulation,
} from "./livePlanComposition";
import { loadOwnerAccessMode } from "./service";

export type OwnerAccessModePresentation = {
  status: "ok" | "unavailable" | "simulation_unavailable";
  mode: "FULL_PLATFORM" | "SIMULATED_PLAN" | null;
  simulatedPlanCode: string | null;
  simulatedPlanName: string | null;
  persisted: boolean;
  simulationUnavailable: boolean;
  reason: string | null;
  livePlans: Array<{ code: string; name: string }>;
};

export async function presentOwnerAccessMode(
  ownerOpenId: string
): Promise<OwnerAccessModePresentation> {
  const state = await loadOwnerAccessMode(ownerOpenId);
  const livePlans = await listCurrentLivePlansForSimulation();

  if (!state.ok) {
    return {
      status: "unavailable",
      mode: null,
      simulatedPlanCode: state.simulatedPlanCode,
      simulatedPlanName: null,
      persisted: true,
      simulationUnavailable: true,
      reason: state.reason,
      livePlans,
    };
  }

  if (state.mode === "FULL_PLATFORM") {
    return {
      status: "ok",
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
      simulatedPlanName: null,
      persisted: state.persisted,
      simulationUnavailable: false,
      reason: null,
      livePlans,
    };
  }

  const composition = await getCurrentLivePlanCompositionByCode(
    state.simulatedPlanCode
  );
  const simulatedPlanName =
    composition?.commercialName ??
    livePlans.find((p) => p.code === state.simulatedPlanCode)?.name ??
    state.simulatedPlanCode;

  if (!composition) {
    return {
      status: "simulation_unavailable",
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: state.simulatedPlanCode,
      simulatedPlanName,
      persisted: state.persisted,
      simulationUnavailable: true,
      reason: "simulation_unavailable",
      livePlans,
    };
  }

  return {
    status: "ok",
    mode: "SIMULATED_PLAN",
    simulatedPlanCode: state.simulatedPlanCode,
    simulatedPlanName,
    persisted: state.persisted,
    simulationUnavailable: false,
    reason: null,
    livePlans,
  };
}
