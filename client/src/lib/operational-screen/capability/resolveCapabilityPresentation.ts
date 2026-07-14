import type { ComponentType } from "react";
import type { RuntimeCapabilityContract } from "./runtimeCapabilityContract";
import { BlockedRolePresentation } from "@/components/operational-screen/roles/BlockedRolePresentation";
import { KitchenRolePresentation } from "@/components/operational-screen/roles/KitchenRolePresentation";
import { KioskRolePresentation } from "@/components/operational-screen/roles/KioskRolePresentation";

const PRESENTATION_BY_CAPABILITY: Record<string, ComponentType> = {
  presentation_tickets: KitchenRolePresentation,
  presentation_kiosk: KioskRolePresentation,
};

/**
 * Resolve presentation from negotiated capabilities — never from role names.
 * KIOSK-SCREEN-ACTIVATION-1: presentation_kiosk → KioskShell host.
 */
export function resolveCapabilityPresentation(
  contract: RuntimeCapabilityContract | null | undefined
): ComponentType {
  if (!contract) return BlockedRolePresentation;

  const kiosk = contract.capabilities.presentation_kiosk;
  if (kiosk?.status === "supported") {
    return PRESENTATION_BY_CAPABILITY.presentation_kiosk ?? KioskRolePresentation;
  }

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
