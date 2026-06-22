/**
 * THERMAL-PRINTING-12E.3C — endpoint operations service (read-model aggregation).
 *
 * Derived entirely from `endpointQueryService` — no direct `agentRegistry` access.
 */
import { ENDPOINT_TYPES } from "../../shared/printing/endpoints/endpointTypes";
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import { getEndpoint, listEndpoints } from "./endpointQueryService";
import type {
  EndpointOperationsByType,
  EndpointOperationsFilter,
  EndpointOperationsItem,
  EndpointOperationsSummary,
} from "./endpointOperationsTypes";

function createEmptyByTypeCounts(): EndpointOperationsByType {
  return ENDPOINT_TYPES.reduce((counts, endpointType) => {
    counts[endpointType] = 0;
    return counts;
  }, {} as EndpointOperationsByType);
}

export function mapEndpointRecordToOperationsItem(
  record: EndpointRecord
): EndpointOperationsItem {
  return {
    endpointId: record.endpointId,
    endpointType: record.endpointType,
    displayName: record.displayName,
    restaurantId: record.restaurantId,
    connectivityState: record.connectivityState,
    lastSeenAt: record.lastSeenAt,
    capabilities: record.capabilities,
  };
}

function matchesOperationsFilter(
  item: EndpointOperationsItem,
  filter: EndpointOperationsFilter | undefined
): boolean {
  if (!filter) {
    return true;
  }

  if (filter.restaurantId !== undefined && item.restaurantId !== filter.restaurantId) {
    return false;
  }

  if (filter.endpointType !== undefined && item.endpointType !== filter.endpointType) {
    return false;
  }

  if (
    filter.connectivityState !== undefined &&
    item.connectivityState !== filter.connectivityState
  ) {
    return false;
  }

  return true;
}

export function listEndpointOperations(
  filter?: EndpointOperationsFilter
): EndpointOperationsItem[] {
  const storageFilter =
    filter?.connectivityState !== undefined
      ? {
          restaurantId: filter.restaurantId,
          endpointType: filter.endpointType,
        }
      : filter;

  return listEndpoints(storageFilter)
    .map(mapEndpointRecordToOperationsItem)
    .filter((item) => matchesOperationsFilter(item, filter))
    .sort((left, right) => left.endpointId.localeCompare(right.endpointId));
}

export function getEndpointOperationsSummary(
  filter?: EndpointOperationsFilter
): EndpointOperationsSummary {
  const items = listEndpointOperations(filter);
  const byType = createEmptyByTypeCounts();

  let onlineEndpoints = 0;
  let offlineEndpoints = 0;
  let staleEndpoints = 0;
  let unknownEndpoints = 0;

  for (const item of items) {
    byType[item.endpointType] += 1;

    switch (item.connectivityState) {
      case "ONLINE":
        onlineEndpoints += 1;
        break;
      case "OFFLINE":
        offlineEndpoints += 1;
        break;
      case "STALE":
        staleEndpoints += 1;
        break;
      case "UNKNOWN":
        unknownEndpoints += 1;
        break;
    }
  }

  return {
    totalEndpoints: items.length,
    onlineEndpoints,
    offlineEndpoints,
    staleEndpoints,
    unknownEndpoints,
    byType,
  };
}

export function getEndpointOperationsItem(
  endpointId: string
): EndpointOperationsItem | undefined {
  const record = getEndpoint(endpointId);
  return record ? mapEndpointRecordToOperationsItem(record) : undefined;
}
