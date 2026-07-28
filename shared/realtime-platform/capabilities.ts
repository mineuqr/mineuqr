/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Surface capability registry — SSOT for future feature adoption.
 * Foundation registers surfaces; features must not declare ad-hoc caps.
 */

import type { RealtimeAuthMode, RealtimeChannel } from "./channels";

export type RealtimeFallbackStrategy = "poll" | "poll_then_broadcast" | "none";

export type RealtimeSurfaceCapability = {
  surfaceId: string;
  supportsRealtime: boolean;
  /** Empty until feature migration programs opt in. */
  channels: readonly RealtimeChannel[];
  fallback: RealtimeFallbackStrategy;
  reconnect: boolean;
  visibilityAware: boolean;
  readFreshness: boolean;
  authMode: RealtimeAuthMode;
  /** Foundation: no surface is migrated yet. */
  migrated: false;
};

/**
 * Canonical registry. All surfaces start with supportsRealtime readiness
 * metadata but migrated=false until a dedicated migration program.
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
      migrated: false,
    },
    {
      surfaceId: "kitchen-screen",
      supportsRealtime: true,
      channels: ["kitchen"],
      fallback: "poll",
      reconnect: true,
      visibilityAware: true,
      readFreshness: true,
      authMode: "device_session",
      migrated: false,
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
