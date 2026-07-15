import { registerRuntimeRole } from "./runtimeRoleRegistry";
import {
  customerDisplayRole,
  expoDisplayRole,
  kitchenDisplayRole,
  pickupDisplayRole,
  printMonitorRole,
  selfOrderingKioskRole,
  waiterDisplayRole,
} from "./roleDefinitions";

let registered = false;

/** Idempotent registration — exactly one registry population at module load. */
export function ensureRuntimeRolesRegistered(): void {
  if (registered) return;
  registerRuntimeRole(kitchenDisplayRole);
  registerRuntimeRole(expoDisplayRole);
  registerRuntimeRole(pickupDisplayRole);
  registerRuntimeRole(customerDisplayRole);
  registerRuntimeRole(printMonitorRole);
  registerRuntimeRole(selfOrderingKioskRole);
  registerRuntimeRole(waiterDisplayRole);
  registered = true;
}

ensureRuntimeRolesRegistered();
