/**
 * THERMAL-PRINTING-12E.2A — canonical endpoint registry record.
 */
import type { EndpointCapabilities } from "./endpointCapabilities";
import type { EndpointConnectivityState } from "./endpointConnectivity";
import type { EndpointType } from "./endpointTypes";

export type EndpointRecord = {
  endpointId: string;
  endpointType: EndpointType;
  restaurantId: number;
  displayName: string;
  connectivityState: EndpointConnectivityState;
  lastSeenAt: Date | null;
  capabilities: EndpointCapabilities;
  metadata?: Record<string, unknown>;
};
