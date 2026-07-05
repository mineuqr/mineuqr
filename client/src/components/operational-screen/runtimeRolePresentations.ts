import type { ComponentType } from "react";
import { BlockedRolePresentation } from "./roles/BlockedRolePresentation";
import { KitchenRolePresentation } from "./roles/KitchenRolePresentation";
import type { RuntimeRoleDefinition } from "@/lib/operational-screen/roles/runtimeRoleContract";

const PRESENTATIONS: Record<RuntimeRoleDefinition["presentationKey"], ComponentType> = {
  kitchen: KitchenRolePresentation,
  blocked: BlockedRolePresentation,
};

export function resolveRolePresentation(definition: RuntimeRoleDefinition): ComponentType {
  return PRESENTATIONS[definition.presentationKey];
}
