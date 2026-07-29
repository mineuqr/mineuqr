/**
 * REALTIME-PLATFORM-FOUNDATION-1 / REALTIME-ORDERS-ADOPTION-1
 * Surface capability registry — SSOT for feature adoption.
 */

import type { RealtimeAuthMode, RealtimeChannel } from "./channels";

export type RealtimeFallbackStrategy = "poll" | "poll_then_broadcast" | "none";

export type RealtimeSurfaceCapability = {
  surfaceId: string;
  supportsRealtime: boolean;
  channels: readonly RealtimeChannel[];
  fallback: RealtimeFallbackStrategy;
  reconnect: boolean;
  visibilityAware: boolean;
  readFreshness: boolean;
  authMode: RealtimeAuthMode;
  /** True only after a certified adoption program. */
  migrated: boolean;
};

/**
 * Canonical registry. Surfaces start migrated=false until adoption programs certify.
 */
export const REALTIME_SURFACE_CAPABILITY_REGISTRY: readonly RealtimeSurfaceCapability[] =
  [
    {
      surfaceId: "orders-workspace",
      supportsRealtime: true,
      channels: ["orders"],
      fallback: "poll_then_broadcast",
      reconnect: true,
      visibilityAware: true,
      readFreshness: true,
      authMode: "staff_session",
      migrated: true, // REALTIME-ORDERS-ADOPTION-1
    },
    {
      surfaceId: "kitchen-screen",
      supportsRealtime: true,
      channels: ["kitchen"],
      fallback: "poll_then_broadcast",
      reconnect: true,
      visibilityAware: true,
      readFreshness: true,
      authMode: "device_session",
      migrated: true, // REALTIME-KITCHEN-ADOPTION-1
    },
    {
      surfaceId: "expo-screen",
      supportsRealtime: true,
      channels: ["expo"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: true,
      authMode: "device_session",
      migrated: false,
    },
    {
      surfaceId: "waiter",
      supportsRealtime: true,
      channels: ["waiter", "sessions"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: true,
      authMode: "device_session",
      migrated: false,
    },
    {
      surfaceId: "customer-tracking",
      supportsRealtime: true,
      channels: ["customer"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: false,
      authMode: "customer_tracking",
      migrated: false,
    },
    {
      surfaceId: "dashboard",
      supportsRealtime: true,
      channels: ["dashboard", "notifications"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: false,
      authMode: "staff_session",
      migrated: false,
    },
    {
      surfaceId: "register",
      supportsRealtime: true,
      channels: ["checks", "sessions"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: false,
      authMode: "staff_session",
      migrated: false,
    },
    {
      surfaceId: "reporting",
      supportsRealtime: true,
      channels: ["reporting"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: false,
      authMode: "staff_session",
      migrated: false,
    },
    {
      surfaceId: "devices-fleet",
      supportsRealtime: true,
      channels: ["devices"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: false,
      readFreshness: false,
      authMode: "staff_session",
      migrated: false,
    },
    {
      surfaceId: "print-workspace",
      supportsRealtime: true,
      channels: ["print"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: false,
      authMode: "staff_session",
      migrated: false,
    },
  ] as const;

export function getRealtimeSurfaceCapability(
  surfaceId: string
): RealtimeSurfaceCapability | undefined {
  return REALTIME_SURFACE_CAPABILITY_REGISTRY.find((s) => s.surfaceId === surfaceId);
}

export function listRealtimeSurfacesReadyForMigration(): readonly RealtimeSurfaceCapability[] {
  return REALTIME_SURFACE_CAPABILITY_REGISTRY.filter((s) => s.supportsRealtime);
}

export function listMigratedRealtimeSurfaces(): readonly RealtimeSurfaceCapability[] {
  return REALTIME_SURFACE_CAPABILITY_REGISTRY.filter((s) => s.migrated);
}
