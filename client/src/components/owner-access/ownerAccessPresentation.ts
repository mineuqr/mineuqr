/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Presentation helpers for owner access UI. Server remains authoritative.
 */

export type OwnerAccessUiState = {
  status: "ok" | "unavailable" | "simulation_unavailable";
  mode: "FULL_PLATFORM" | "SIMULATED_PLAN" | null;
  simulatedPlanCode: string | null;
  simulatedPlanName: string | null;
};

export function ownerAccessStatusLabel(state: OwnerAccessUiState): {
  tone: "full" | "simulating" | "unavailable";
  key:
    | "ownerAccess.fullPlatform"
    | "ownerAccess.simulating"
    | "ownerAccess.unavailable";
} {
  if (state.status === "unavailable" || state.status === "simulation_unavailable") {
    return { tone: "unavailable", key: "ownerAccess.unavailable" };
  }
  if (state.mode === "SIMULATED_PLAN") {
    return { tone: "simulating", key: "ownerAccess.simulating" };
  }
  return { tone: "full", key: "ownerAccess.fullPlatform" };
}

export function isOwnerSimulation(state: OwnerAccessUiState | null | undefined): boolean {
  return state?.status === "ok" && state.mode === "SIMULATED_PLAN";
}

export function isOwnerFullPlatform(state: OwnerAccessUiState | null | undefined): boolean {
  return state?.status === "ok" && state.mode === "FULL_PLATFORM";
}
