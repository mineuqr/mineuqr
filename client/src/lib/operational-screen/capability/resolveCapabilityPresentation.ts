import type { ComponentType } from "react";
import type { RuntimeCapabilityContract } from "./runtimeCapabilityContract";
import { BlockedRolePresentation } from "@/components/operational-screen/roles/BlockedRolePresentation";
import { KitchenRolePresentation } from "@/components/operational-screen/roles/KitchenRolePresentation";

const PRESENTATION_BY_CAPABILITY: Record<string, ComponentType> = {
  presentation_tickets: KitchenRolePresentation,
};

/**
 * Resolve presentation from negotiated capabilities — never from role names.
 */
export function resolveCapabilityPresentation(
  contract: RuntimeCapabilityContract | null | undefined
): ComponentType {
  if (!contract) return BlockedRolePresentation;

  const presentation = contract.capabilities.presentation_tickets;
  if (presentation.status === "supported") {
    return PRESENTATION_BY_CAPABILITY.presentation_tickets ?? KitchenRolePresentation;
  }

  return BlockedRolePresentation;
}

export function isCapabilitySupported(
  contract: RuntimeCapabilityContract | null | undefined,
  capabilityId: keyof RuntimeCapabilityContract["capabilities"]
): boolean {
  return contract?.capabilities[capabilityId]?.status === "supported";
}
