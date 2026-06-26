/**
 * THERMAL-PRINTING-13I.3B — shared discovery inputs for setup state evaluation.
 */
import { getAgentConnectivityState, listAgentConnectivityStates } from "../agentLifecycleService";
import { getAgent } from "../agentRegistry";
import { resolveRestaurantIdForAgent } from "../endpointRegistryCompatibility";
import { isAgentOwnedByRestaurant } from "../tenantOwnershipAuthority";
import { getAgentPrinterProfiles } from "../printerProfileQueries";
import { listPrintersForRestaurant } from "../printerRepository";
import {
  buildBindingStatusItemFromReport,
  buildUnknownBindingStatusItem,
  getPrinterBindingStatus,
} from "../printerBindingStatusQueries";
import { detectProfilePrinterOwnershipConflict } from "../resolutionConflictService";
import { getPrinterResolution } from "../resolutionQueries";
import type {
  DiscoveryAgentItem,
  OwnershipConflictItem,
  PrinterBindingStatusItem,
} from "../printOperationsDiscoveryTypes";

export type SetupRestaurantPrinter = {
  id: number;
  name: string;
  profileId: string;
  paperWidthMm: number;
  isDefault: boolean;
  updatedAt: string;
};

export function buildDiscoveryAgentItem(input: {
  agentId: string;
  status: "offline" | "online" | "stale";
  restaurantId: number;
  restaurantProfileIds: Set<string>;
}): DiscoveryAgentItem {
  const inventory = getAgentPrinterProfiles(input.agentId);
  const profileIds = (inventory?.profiles ?? []).map((profile) => profile.printerId);
  const inferredRestaurantId = resolveRestaurantIdForAgent(input.agentId) ?? null;
  const relevantToRestaurant = isAgentOwnedByRestaurant(input.agentId, input.restaurantId);

  return {
    agentId: input.agentId,
    status: input.status,
    inferredRestaurantId,
    reportedProfileCount: profileIds.length,
    profileIds,
    relevantToRestaurant,
  };
}

export function detectOwnershipConflicts(
  restaurantId: number,
  printers: Array<{ id: number; name: string; profileId: string }>
): OwnershipConflictItem[] {
  const conflicts: OwnershipConflictItem[] = [];

  for (const printer of printers) {
    const profileId = printer.profileId.trim();
    if (!profileId) {
      continue;
    }

    const ownership = detectProfilePrinterOwnershipConflict(profileId);
    if (!ownership.conflict && !ownership.agentId) {
      continue;
    }

    const ownerAgentId = ownership.conflict ? ownership.agentIds[0]! : ownership.agentId!;
    const owningRestaurantId = resolveRestaurantIdForAgent(ownerAgentId);
    if (!owningRestaurantId || owningRestaurantId === restaurantId) {
      continue;
    }

    conflicts.push({
      profileId,
      agentId: ownerAgentId,
      owningRestaurantId,
      currentRestaurantId: restaurantId,
      printerId: printer.id,
      printerName: printer.name,
    });
  }

  return conflicts;
}

export function buildRestaurantBindingStatus(
  printers: Array<{
    id: number;
    name: string;
    profileId: string;
  }>
): PrinterBindingStatusItem[] {
  return printers.map((printer) => {
    const profileId = printer.profileId.trim();
    const resolution = getPrinterResolution(printer.id);
    const agentId = resolution?.agentId ?? null;

    if (!profileId) {
      return buildUnknownBindingStatusItem({
        printerId: printer.id,
        profileId,
        logicalPrinterName: printer.name,
        agentId,
        message: "Printer profileId is missing",
      });
    }

    if (!agentId) {
      return buildUnknownBindingStatusItem({
        printerId: printer.id,
        profileId,
        logicalPrinterName: printer.name,
        agentId: null,
        message: "Printer is not resolved to an agent",
      });
    }

    const reportItem = getPrinterBindingStatus(agentId, profileId);
    if (!reportItem) {
      return buildUnknownBindingStatusItem({
        printerId: printer.id,
        profileId,
        logicalPrinterName: printer.name,
        agentId,
        message: "Agent has not reported binding status yet",
      });
    }

    return buildBindingStatusItemFromReport({
      printerId: printer.id,
      logicalPrinterName: printer.name,
      agentId,
      reportItem,
    });
  });
}

export function resolvePrimaryPrinter(
  printers: Array<{ id: number; name: string; profileId: string; isDefault: boolean }>
): { id: number; name: string; profileId: string } | null {
  if (printers.length === 0) {
    return null;
  }

  const defaultRow = printers.find((printer) => printer.isDefault);
  if (defaultRow) {
    return {
      id: defaultRow.id,
      name: defaultRow.name,
      profileId: defaultRow.profileId,
    };
  }

  const first = printers[0]!;
  return {
    id: first.id,
    name: first.name,
    profileId: first.profileId,
  };
}

export function listRelevantAgents(restaurantId: number, restaurantProfileIds: Set<string>) {
  return listAgentConnectivityStates().map((state) =>
    buildDiscoveryAgentItem({
      agentId: state.agentId,
      status: state.status,
      restaurantId,
      restaurantProfileIds,
    })
  );
}

export function selectPreferredAgent(agents: DiscoveryAgentItem[]): DiscoveryAgentItem | null {
  const relevant = agents.filter((agent) => agent.relevantToRestaurant);
  if (relevant.length === 0) {
    return null;
  }

  const online = relevant.find((agent) => agent.status === "online");
  if (online) {
    return online;
  }

  const stale = relevant.find((agent) => agent.status === "stale");
  if (stale) {
    return stale;
  }

  return relevant[0] ?? null;
}

export function getAgentStatusForPrinter(agentId: string | null): "offline" | "online" | "stale" | null {
  if (!agentId) {
    return null;
  }
  return getAgentConnectivityState(agentId)?.status ?? null;
}

export function getAgentLastSeenAt(agentId: string | null): string | null {
  if (!agentId) {
    return null;
  }
  const connectivity = getAgentConnectivityState(agentId);
  if (!connectivity?.lastHeartbeatAt) {
    return getAgent(agentId)?.registration.connectedAt ?? null;
  }
  return connectivity.lastHeartbeatAt;
}

export async function loadSetupRestaurantPrinters(
  restaurantId: number
): Promise<SetupRestaurantPrinter[]> {
  const printers = await listPrintersForRestaurant(restaurantId);
  return printers.map((printer) => ({
    id: printer.id,
    name: printer.name,
    profileId: printer.profileId,
    paperWidthMm: printer.paperWidthMm,
    isDefault: printer.isDefault,
    updatedAt: printer.updatedAt,
  }));
}
