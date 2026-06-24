/**
 * THERMAL-PRINTING-13I.1H — read-only printer discovery and ownership diagnostics.
 */
import { getAgentConnectivityState, listAgentConnectivityStates } from "./agentLifecycleService";
import { resolveRestaurantIdForAgent } from "./endpointRegistryCompatibility";
import { getEndpointOperationsSummary } from "./endpointOperationsService";
import { getAgentPrinterProfiles } from "./printerProfileQueries";
import { listPrintersForRestaurant } from "./printerRepository";
import { detectProfilePrinterOwnershipConflict } from "./resolutionConflictService";
import { getPrinterResolution } from "./resolutionQueries";
import type {
  DiscoveryAgentItem,
  OwnershipConflictItem,
  PrintDiscoveryDiagnostics,
  PrinterInventoryEmptyReason,
} from "./printOperationsDiscoveryTypes";
import type { PrinterOverviewItem } from "./printOperationsTypes";
import { buildPrintAgentConnectConfig } from "./printAgentConnectConfig";
import { buildSuggestedPrintAgentId } from "./printerProfileId";
import type { ProvisioningStep } from "./printOperationsProvisioningTypes";

function buildDiscoveryAgentItem(input: {
  agentId: string;
  status: "offline" | "online" | "stale";
  restaurantId: number;
  restaurantProfileIds: Set<string>;
}): DiscoveryAgentItem {
  const inventory = getAgentPrinterProfiles(input.agentId);
  const profileIds = (inventory?.profiles ?? []).map((profile) => profile.printerId);
  const inferredRestaurantId = resolveRestaurantIdForAgent(input.agentId) ?? null;
  const relevantToRestaurant =
    input.restaurantProfileIds.size === 0
      ? inferredRestaurantId === input.restaurantId
      : profileIds.some((profileId) => input.restaurantProfileIds.has(profileId));

  return {
    agentId: input.agentId,
    status: input.status,
    inferredRestaurantId,
    reportedProfileCount: profileIds.length,
    profileIds,
    relevantToRestaurant,
  };
}

function detectOwnershipConflicts(
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

function resolveEmptyReason(input: {
  assignedDbPrinters: number;
  activePrinters: number;
  connectedAgentsForRestaurant: number;
  discoveredPrinterProfiles: number;
  ownershipConflicts: OwnershipConflictItem[];
  agents: DiscoveryAgentItem[];
  restaurantId: number;
}): PrinterInventoryEmptyReason | null {
  if (input.assignedDbPrinters === 0) {
    return "no_db_printers";
  }
  if (input.ownershipConflicts.length > 0) {
    return "ownership_conflict";
  }
  if (input.connectedAgentsForRestaurant === 0) {
    const onlineAgentsForRestaurant = input.agents.filter(
      (agent) =>
        agent.status === "online" && agent.inferredRestaurantId === input.restaurantId
    );
    if (onlineAgentsForRestaurant.length > 0) {
      return "agent_no_matching_profiles";
    }
    return "no_agent_connected";
  }
  if (input.discoveredPrinterProfiles === 0) {
    return "agent_no_matching_profiles";
  }
  if (input.activePrinters === 0) {
    return "printers_inactive";
  }
  return null;
}

function resolveProvisioningStep(input: {
  assignedDbPrinters: number;
  activePrinters: number;
  ownershipConflicts: OwnershipConflictItem[];
}): ProvisioningStep {
  if (input.ownershipConflicts.length > 0) {
    return "blocked";
  }
  if (input.assignedDbPrinters === 0) {
    return "add_printer";
  }
  if (input.activePrinters === 0) {
    return "connect_agent";
  }
  return "test_print";
}

function resolvePrimaryPrinter(
  printers: Array<{ id: number; name: string; isDefault: boolean }>,
  printerOverviews?: PrinterOverviewItem[]
): { id: number; name: string } | null {
  if (printers.length === 0) {
    return null;
  }

  const defaultRow = printers.find((printer) => printer.isDefault);
  if (defaultRow) {
    return { id: defaultRow.id, name: defaultRow.name };
  }

  if (printerOverviews) {
    const active = printerOverviews.find((printer) => printer.isActive);
    if (active) {
      return { id: active.id, name: active.name };
    }
  }

  const first = printers[0]!;
  return { id: first.id, name: first.name };
}

function buildProvisioningState(input: {
  restaurantId: number;
  printers: Array<{
    id: number;
    name: string;
    profileId: string;
    paperWidthMm: number;
    isDefault: boolean;
  }>;
  assignedDbPrinters: number;
  activePrinters: number;
  ownershipConflicts: OwnershipConflictItem[];
  printerOverviews?: PrinterOverviewItem[];
}) {
  const step = resolveProvisioningStep({
    assignedDbPrinters: input.assignedDbPrinters,
    activePrinters: input.activePrinters,
    ownershipConflicts: input.ownershipConflicts,
  });
  const primary = resolvePrimaryPrinter(input.printers, input.printerOverviews);
  const connectRows = input.printers.map((printer) => ({
    id: printer.id,
    name: printer.name,
    profileId: printer.profileId,
    paperWidthMm: printer.paperWidthMm,
  }));

  return {
    step,
    suggestedAgentId: buildSuggestedPrintAgentId(input.restaurantId),
    primaryPrinterId: primary?.id ?? null,
    primaryPrinterName: primary?.name ?? null,
    connectConfig:
      step === "connect_agent" || step === "test_print"
        ? buildPrintAgentConnectConfig(input.restaurantId, connectRows)
        : null,
  };
}

export async function getPrintDiscoveryDiagnostics(
  restaurantId: number,
  printerOverviews?: PrinterOverviewItem[]
): Promise<PrintDiscoveryDiagnostics> {
  const printers = await listPrintersForRestaurant(restaurantId);
  const restaurantProfileIds = new Set(
    printers.map((printer) => printer.profileId.trim()).filter((profileId) => profileId.length > 0)
  );

  const connectivityStates = listAgentConnectivityStates();
  const connectedAgentsGlobal = connectivityStates.filter(
    (state) => state.status === "online"
  ).length;

  const agents = connectivityStates.map((state) =>
    buildDiscoveryAgentItem({
      agentId: state.agentId,
      status: state.status,
      restaurantId,
      restaurantProfileIds,
    })
  );

  const relevantOnlineAgents = agents.filter(
    (agent) => agent.status === "online" && agent.relevantToRestaurant
  );
  const connectedAgentsForRestaurant = relevantOnlineAgents.length;

  const discoveredProfileIds = new Set<string>();
  for (const agent of relevantOnlineAgents) {
    for (const profileId of agent.profileIds) {
      discoveredProfileIds.add(profileId);
    }
  }

  const endpointSummary = getEndpointOperationsSummary({ restaurantId });
  const ownershipConflicts = detectOwnershipConflicts(restaurantId, printers);

  let activePrinters = printerOverviews?.filter((printer) => printer.isActive).length;
  if (activePrinters === undefined) {
    activePrinters = printers.filter((printer) => {
      const resolution = getPrinterResolution(printer.id);
      if (!resolution) {
        return false;
      }
      const connectivity = getAgentConnectivityState(resolution.agentId);
      return connectivity?.status === "online";
    }).length;
  }

  const emptyReason = resolveEmptyReason({
    assignedDbPrinters: printers.length,
    activePrinters,
    connectedAgentsForRestaurant,
    discoveredPrinterProfiles: discoveredProfileIds.size,
    ownershipConflicts,
    agents,
    restaurantId,
  });

  const isInventoryEmpty = printers.length === 0 || activePrinters === 0;

  const provisioning = buildProvisioningState({
    restaurantId,
    printers,
    assignedDbPrinters: printers.length,
    activePrinters,
    ownershipConflicts,
    printerOverviews,
  });

  return {
    restaurantId,
    isInventoryEmpty,
    emptyReason: isInventoryEmpty ? emptyReason : null,
    counts: {
      connectedAgentsGlobal,
      connectedAgentsForRestaurant,
      connectedEndpoints: endpointSummary.onlineEndpoints,
      discoveredPrinterProfiles: discoveredProfileIds.size,
      assignedDbPrinters: printers.length,
      activePrinters,
    },
    agents: agents.sort((left, right) => left.agentId.localeCompare(right.agentId)),
    ownershipConflicts,
    provisioning,
  };
}
