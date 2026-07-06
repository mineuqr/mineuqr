import { spaNavigate } from "@/const";
import { buildDashboardPath } from "@/lib/dashboardUrl";

export type ProvisioningUrlState = {
  sessionId: string | null;
  mode: "create" | "rotate" | "resume" | "status" | null;
  deviceId: string | null;
};

export function readProvisioningUrlState(): ProvisioningUrlState {
  const params = new URLSearchParams(window.location.search);
  return {
    sessionId: params.get("provisionSession"),
    mode: (params.get("provisionMode") as ProvisioningUrlState["mode"]) ?? null,
    deviceId: params.get("deviceId"),
  };
}

export function buildProvisioningPath(params: {
  restaurantId: number;
  sessionId?: string | null;
  mode?: "create" | "rotate" | "resume" | "status" | null;
  deviceId?: string | null;
}): string {
  const base = buildDashboardPath({ restaurantId: params.restaurantId, section: "screen-provisioning" });
  const search = new URLSearchParams(base.includes("?") ? base.split("?")[1] : "");
  if (params.sessionId) search.set("provisionSession", params.sessionId);
  if (params.mode) search.set("provisionMode", params.mode);
  if (params.deviceId) search.set("deviceId", params.deviceId);
  return `/dashboard?${search.toString()}`;
}

export function navigateToProvisioning(
  params: {
    restaurantId: number;
    sessionId?: string | null;
    mode?: "create" | "rotate" | "resume" | "status" | null;
    deviceId?: string | null;
  },
  options?: { replace?: boolean }
): void {
  spaNavigate(buildProvisioningPath(params), options);
}

export function navigateToFleet(restaurantId: number): void {
  spaNavigate(buildDashboardPath({ restaurantId, section: "screens" }), { replace: false });
}
