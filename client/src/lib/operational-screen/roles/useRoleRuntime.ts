import { useMemo } from "react";
import { useScreenRuntime } from "@/components/operational-screen/OperationalScreenRuntimeProvider";
import { resolveRuntimeRole } from "@/lib/operational-screen/roles/runtimeRoleRegistry";
import { buildRoleRuntimeHealth, collectRoleDiagnostics } from "@/lib/operational-screen/roles/runtimeRoleHealth";
import { buildLifecycleContext } from "@/lib/operational-screen/roles/runtimeRoleLifecycle";
import type { RoleRuntimeHealth } from "@/lib/operational-screen/roles/runtimeRoleContract";

export function useResolvedRuntimeRole() {
  const runtime = useScreenRuntime();
  const { context, phase, roleHealth, roleDiagnostics } = runtime;

  const definition = useMemo(() => {
    if (!context) return null;
    return resolveRuntimeRole(context.identity.role);
  }, [context]);

  return { definition, context, phase, roleHealth, roleDiagnostics };
}

export function useRoleRuntimeHealth(): RoleRuntimeHealth | null {
  const { roleHealth } = useScreenRuntime();
  return roleHealth;
}

export { buildRoleRuntimeHealth, collectRoleDiagnostics };
