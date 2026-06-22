/**
 * THERMAL-PRINTING-12E.3A — official endpoint registry query API.
 *
 * Stable read surface for hydrated endpoint runtime state. Mutation and projection
 * remain in `endpointRegistry` / `endpointProjectionService`.
 */
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import type { ListEndpointsFilter } from "../../shared/printing/endpoints/endpointRegistryContract";
import {
  getEndpoint as readEndpointFromRegistry,
  listEndpoints as listEndpointsFromRegistry,
} from "./endpointRegistry";

export type EndpointQueryFilter = ListEndpointsFilter;

/**
 * Returns a single endpoint with live connectivity and capabilities.
 */
export function getEndpoint(endpointId: string): EndpointRecord | undefined {
  return readEndpointFromRegistry(endpointId);
}

/**
 * Returns all known endpoints with live hydrated runtime state.
 */
export function listEndpoints(filter?: EndpointQueryFilter): EndpointRecord[] {
  return listEndpointsFromRegistry(filter);
}
