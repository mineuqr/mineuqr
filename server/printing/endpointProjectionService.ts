/**
 * THERMAL-PRINTING-12E.2B — runtime endpoint projection (read-model sync).
 *
 * Projects authoritative agent runtime state into `endpointRegistry` without
 * changing routing, assignment, resolution, execution, or transport behavior.
 */
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import { getAgent } from "./agentRegistry";
import {
  buildEndpointProjectionMetadata,
  mapAgentIdToEndpointId,
  projectRegisteredAgentToEndpointRecord,
  resolveEndpointCapabilitiesFromStores,
  resolveEndpointConnectivityForAgent,
  resolveRestaurantIdForAgent,
  shouldProjectWindowsAgent,
} from "./endpointRegistryCompatibility";
import {
  getStoredEndpointRecord,
  upsertProjectedEndpoint,
} from "./endpointRegistry";

export function syncAgentEndpointProjection(agentId: string): void {
  const agent = getAgent(agentId);
  if (!agent || !shouldProjectWindowsAgent(agent)) {
    return;
  }

  const endpointId = mapAgentIdToEndpointId(agentId);
  const stored = getStoredEndpointRecord(endpointId);
  const restaurantId = resolveRestaurantIdForAgent(agentId, {
    storedRestaurantId: stored?.restaurantId,
  });
  if (!restaurantId) {
    return;
  }

  const record = projectRegisteredAgentToEndpointRecord({
    agent,
    restaurantId,
    displayName: stored?.displayName,
    connectivityState: resolveEndpointConnectivityForAgent(agentId),
    capabilities: resolveEndpointCapabilitiesFromStores(agentId),
    metadata: buildEndpointProjectionMetadata(agentId, stored?.metadata),
  });

  upsertProjectedEndpoint(record);
}

export function syncAgentEndpointDisconnect(agentId: string): void {
  const agent = getAgent(agentId);
  if (!agent || !shouldProjectWindowsAgent(agent)) {
    return;
  }

  const endpointId = mapAgentIdToEndpointId(agentId);
  const stored = getStoredEndpointRecord(endpointId);
  const restaurantId = resolveRestaurantIdForAgent(agentId, {
    storedRestaurantId: stored?.restaurantId,
  });
  if (!restaurantId) {
    return;
  }

  const record: EndpointRecord = projectRegisteredAgentToEndpointRecord({
    agent,
    restaurantId,
    displayName: stored?.displayName,
    connectivityState: "OFFLINE",
    capabilities: resolveEndpointCapabilitiesFromStores(agentId),
    metadata: buildEndpointProjectionMetadata(agentId, stored?.metadata),
  });

  upsertProjectedEndpoint(record);
}

export function syncAgentEndpointOnRegistration(agentId: string): void {
  syncAgentEndpointProjection(agentId);
}

export function syncAgentEndpointOnHeartbeat(agentId: string): void {
  syncAgentEndpointProjection(agentId);
}

export function syncAgentEndpointOnCapabilitiesReport(agentId: string): void {
  syncAgentEndpointProjection(agentId);
}

export function syncAgentEndpointOnPrinterProfilesReport(agentId: string): void {
  syncAgentEndpointProjection(agentId);
}
