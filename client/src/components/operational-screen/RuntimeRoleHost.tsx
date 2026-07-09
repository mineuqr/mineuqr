import { useEffect, useRef } from "react";
import "@/lib/operational-screen/roles/registerRoles";
import { useScreenRuntime } from "./OperationalScreenRuntimeProvider";
import { resolveRuntimeRole } from "@/lib/operational-screen/roles/runtimeRoleRegistry";
import {
  buildLifecycleContext,
  invokeLifecycle,
} from "@/lib/operational-screen/roles/runtimeRoleLifecycle";
import { RoleRuntimeStatusBanner } from "./RoleRuntimeStatusBanner";
import { RuntimeOperationalAlert } from "./RuntimeOperationalAlert";
import { resolveCapabilityPresentation } from "@/lib/operational-screen/capability/resolveCapabilityPresentation";
import { isCapabilitySupported } from "@/lib/operational-screen/capability/resolveCapabilityPresentation";

/**
 * ROLE-RUNTIME-1 — single resolver entry point.
 * Resolves role from registry, executes role lifecycle, renders role presentation.
 */
export function RuntimeRoleHost() {
  const runtime = useScreenRuntime();
  const { context, phase, rolePlatform } = runtime;
  const initializedRef = useRef(false);
  const prevPhaseRef = useRef(phase);
  const prevConfigVersionRef = useRef<string | null>(null);

  const role = context?.identity.role ?? null;
  const definition = role ? resolveRuntimeRole(role) : null;

  useEffect(() => {
    if (!context || !definition || initializedRef.current) return;
    const ctx = buildLifecycleContext(definition, {
      context,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });
    invokeLifecycle(definition.lifecycle, "initialize", ctx);
    initializedRef.current = true;
    return () => {
      invokeLifecycle(definition.lifecycle, "dispose", ctx);
      initializedRef.current = false;
    };
  }, [context, definition, phase, rolePlatform]);

  useEffect(() => {
    if (!context || !definition) return;
    const ctx = buildLifecycleContext(definition, {
      context,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });
    invokeLifecycle(definition.lifecycle, "mount", ctx);
  }, [context, definition, phase, rolePlatform]);

  useEffect(() => {
    if (!context || !definition) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const ctx = buildLifecycleContext(definition, {
      context,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });

    if (phase === "running" && context.runtimeCapabilities.presentationSupport === "supported") {
      invokeLifecycle(definition.lifecycle, "activate", ctx);
    }
    if (prev === "running" && phase !== "running") {
      invokeLifecycle(definition.lifecycle, "deactivate", ctx);
    }
    if (prev === "degraded" && phase !== "degraded") {
      invokeLifecycle(definition.lifecycle, "handleReconnect", ctx);
    }
  }, [context, definition, phase, rolePlatform]);

  useEffect(() => {
    if (!context || !definition) return;
    const version = context.configurationVersion;
    if (prevConfigVersionRef.current === version) return;

    const ctx = buildLifecycleContext(definition, {
      context,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });
    invokeLifecycle(definition.lifecycle, "handleConfiguration", ctx, context.runtimeConfiguration);
    prevConfigVersionRef.current = version;
  }, [context, definition, phase, rolePlatform]);

  useEffect(() => {
    if (!context || !definition || rolePlatform.heartbeatCount === 0) return;
    const ctx = buildLifecycleContext(definition, {
      context,
      bootstrapPhase: phase,
      heartbeatCount: rolePlatform.heartbeatCount,
      reconnectCount: rolePlatform.reconnectCount,
      reconnecting: rolePlatform.reconnecting,
    });
    invokeLifecycle(definition.lifecycle, "handleHeartbeat", ctx);
  }, [context, definition, phase, rolePlatform.heartbeatCount, rolePlatform.reconnectCount, rolePlatform.reconnecting]);

  if (!context || !definition) return null;

  const Presentation = resolveCapabilityPresentation(context.runtimeCapabilities);

  return (
    <>
      {import.meta.env.DEV ? <RoleRuntimeStatusBanner /> : null}
      <RuntimeOperationalAlert />
      <Presentation />
    </>
  );
}
