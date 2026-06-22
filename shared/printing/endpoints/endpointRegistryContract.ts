/**
 * THERMAL-PRINTING-12E.2A — endpoint registry service contract (interfaces only).
 *
 * Production runtime integration and migration from agentRegistry /
 * printerProfileStore belong to THERMAL-PRINTING-12E.2B and later phases.
 */
import type { EndpointCapabilities } from "./endpointCapabilities";
import type { EndpointConnectivityState } from "./endpointConnectivity";
import type { EndpointRecord } from "./endpointRecord";
import type { EndpointType } from "./endpointTypes";

export type RegisterEndpointInput = {
  endpointId: string;
  endpointType: EndpointType;
  restaurantId: number;
  displayName: string;
  capabilities: EndpointCapabilities;
  metadata?: Record<string, unknown>;
  registeredAt?: Date;
};

export type UpdateEndpointHeartbeatInput = {
  endpointId: string;
  seenAt: Date;
  connectivityState?: EndpointConnectivityState;
};

export type UpdateEndpointCapabilitiesInput = {
  endpointId: string;
  capabilities: EndpointCapabilities;
  updatedAt?: Date;
};

export type ListEndpointsFilter = {
  restaurantId?: number;
  endpointType?: EndpointType;
  connectivityState?: EndpointConnectivityState;
};

/**
 * Platform-neutral endpoint registry contract.
 *
 * Implementations may use in-memory storage initially; persistence and
 * dual-write compatibility adapters are out of scope for 12E.2A.
 */
export interface EndpointRegistry {
  registerEndpoint(input: RegisterEndpointInput): EndpointRecord;
  updateEndpointHeartbeat(input: UpdateEndpointHeartbeatInput): EndpointRecord;
  updateEndpointCapabilities(input: UpdateEndpointCapabilitiesInput): EndpointRecord;
  getEndpoint(endpointId: string): EndpointRecord | undefined;
  listEndpoints(filter?: ListEndpointsFilter): EndpointRecord[];
}
