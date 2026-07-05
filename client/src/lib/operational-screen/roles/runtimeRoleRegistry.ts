import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { RuntimeRoleDefinition } from "./runtimeRoleContract";

const registry = new Map<OperationalDeviceRole, RuntimeRoleDefinition>();

export function registerRuntimeRole(definition: RuntimeRoleDefinition): void {
  registry.set(definition.metadata.role, definition);
}

export function resolveRuntimeRole(role: OperationalDeviceRole): RuntimeRoleDefinition {
  const definition = registry.get(role);
  if (!definition) {
    throw new Error(`runtime_role_not_registered:${role}`);
  }
  return definition;
}

export function supportedRuntimeRoles(): OperationalDeviceRole[] {
  return Array.from(registry.keys());
}

export function isRoleOperational(role: OperationalDeviceRole): boolean {
  return resolveRuntimeRole(role).metadata.operational;
}

export function clearRuntimeRoleRegistryForTests(): void {
  registry.clear();
}
