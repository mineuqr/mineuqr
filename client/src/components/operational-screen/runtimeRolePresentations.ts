import type { ComponentType } from "react";
import { BlockedRolePresentation } from "./roles/BlockedRolePresentation";
import { KitchenRolePresentation } from "./roles/KitchenRolePresentation";
import { KioskRolePresentation } from "./roles/KioskRolePresentation";
import { WaiterRolePresentation } from "./roles/WaiterRolePresentation";
import type { RuntimeRoleDefinition } from "@/lib/operational-screen/roles/runtimeRoleContract";

const PRESENTATIONS: Record<RuntimeRoleDefinition["presentationKey"], ComponentType> = {
  kitchen: KitchenRolePresentation,
  kiosk: KioskRolePresentation,
  waiter: WaiterRolePresentation,
  blocked: BlockedRolePresentation,
};

export function resolveRolePresentation(definition: RuntimeRoleDefinition): ComponentType {
  return PRESENTATIONS[definition.presentationKey];
}
