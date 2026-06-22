/**
 * THERMAL-PRINTING-12E.3B — endpoint operations read-model types (visibility only).
 */
import type { EndpointCapabilities } from "../../shared/printing/endpoints/endpointCapabilities";
import type { EndpointConnectivityState } from "../../shared/printing/endpoints/endpointConnectivity";
import type { EndpointType } from "../../shared/printing/endpoints/endpointTypes";

/**
 * Operational visibility view of a printing endpoint.
 * Read-model only — no routing, assignment, or execution responsibilities.
 */
export type EndpointOperationsItem = {
  endpointId: string;
  endpointType: EndpointType;
  displayName: string;
  restaurantId: number;
  connectivityState: EndpointConnectivityState;
  lastSeenAt: Date | null;
  capabilities: EndpointCapabilities;
};

export type EndpointOperationsByType = Record<EndpointType, number>;

export type EndpointOperationsSummary = {
  totalEndpoints: number;
  onlineEndpoints: number;
  offlineEndpoints: number;
  staleEndpoints: number;
  unknownEndpoints: number;
  byType: EndpointOperationsByType;
};

export type EndpointOperationsFilter = {
  restaurantId?: number;
  endpointType?: EndpointType;
  connectivityState?: EndpointConnectivityState;
};
