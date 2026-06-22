/**
 * THERMAL-PRINTING-12E.2A / 12E.2B — in-memory endpoint registry (projection read-model).
 *
 * Authoritative agent runtime stores remain `agentRegistry`, `printerProfileStore`,
 * and `platformCapabilityStore`. Endpoint records are synchronized projections;
 * `getEndpoint` / `listEndpoints` hydrate live connectivity and capabilities.
 */
import {
  evaluateEndpointConnectivityState,
  type EndpointConnectivityState,
} from "../../shared/printing/endpoints/endpointConnectivity";
import {
  validateEndpointCapabilities,
  type EndpointCapabilities,
} from "../../shared/printing/endpoints/endpointCapabilities";
import type { EndpointRecord } from "../../shared/printing/endpoints/endpointRecord";
import type {
  EndpointRegistry,
  ListEndpointsFilter,
  RegisterEndpointInput,
  UpdateEndpointCapabilitiesInput,
  UpdateEndpointHeartbeatInput,
} from "../../shared/printing/endpoints/endpointRegistryContract";
import { assertEndpointType } from "../../shared/printing/endpoints/endpointTypes";
import { hydrateStoredEndpointRecord } from "./endpointRegistryCompatibility";

export class EndpointRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointRegistryError";
  }
}

type StoredEndpointRecord = EndpointRecord & {
  registeredAt: Date;
  capabilitiesUpdatedAt: Date;
};

function normalizeEndpointId(endpointId: string): string {
  const normalized = endpointId.trim();
  if (!normalized) {
    throw new EndpointRegistryError("Endpoint id is required");
  }
  return normalized;
}

function normalizeDisplayName(displayName: string): string {
  const normalized = displayName.trim();
  if (!normalized) {
    throw new EndpointRegistryError("Display name is required");
  }
  return normalized;
}

function assertRestaurantId(restaurantId: number): number {
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new EndpointRegistryError("Restaurant id must be a positive integer");
  }
  return restaurantId;
}

function toPublicRecord(record: StoredEndpointRecord): EndpointRecord {
  return {
    endpointId: record.endpointId,
    endpointType: record.endpointType,
    restaurantId: record.restaurantId,
    displayName: record.displayName,
    connectivityState: record.connectivityState,
    lastSeenAt: record.lastSeenAt,
    capabilities: record.capabilities,
    metadata: record.metadata ? { ...record.metadata } : undefined,
  };
}

function resolveConnectivityState(
  record: StoredEndpointRecord,
  override?: EndpointConnectivityState
): EndpointConnectivityState {
  if (override) {
    return override;
  }

  return evaluateEndpointConnectivityState({
    isRegistered: true,
    lastSeenAt: record.lastSeenAt,
  });
}

function matchesFilter(
  record: StoredEndpointRecord,
  filter: ListEndpointsFilter | undefined
): boolean {
  if (!filter) {
    return true;
  }

  if (
    filter.restaurantId !== undefined &&
    record.restaurantId !== filter.restaurantId
  ) {
    return false;
  }

  if (
    filter.endpointType !== undefined &&
    record.endpointType !== filter.endpointType
  ) {
    return false;
  }

  if (
    filter.connectivityState !== undefined &&
    record.connectivityState !== filter.connectivityState
  ) {
    return false;
  }

  return true;
}

export class InMemoryEndpointRegistry implements EndpointRegistry {
  private readonly endpoints = new Map<string, StoredEndpointRecord>();

  registerEndpoint(input: RegisterEndpointInput): EndpointRecord {
    const endpointId = normalizeEndpointId(input.endpointId);
    const endpointType = assertEndpointType(input.endpointType);
    const restaurantId = assertRestaurantId(input.restaurantId);
    const displayName = normalizeDisplayName(input.displayName);
    const capabilities = validateEndpointCapabilities(input.capabilities);
    const registeredAt = input.registeredAt ?? new Date();

    const record: StoredEndpointRecord = {
      endpointId,
      endpointType,
      restaurantId,
      displayName,
      connectivityState: "ONLINE",
      lastSeenAt: registeredAt,
      capabilities,
      metadata: input.metadata ? { ...input.metadata } : undefined,
      registeredAt,
      capabilitiesUpdatedAt: registeredAt,
    };

    this.endpoints.set(endpointId, record);
    return toPublicRecord(record);
  }

  updateEndpointHeartbeat(input: UpdateEndpointHeartbeatInput): EndpointRecord {
    const endpointId = normalizeEndpointId(input.endpointId);
    const record = this.endpoints.get(endpointId);
    if (!record) {
      throw new EndpointRegistryError(`Endpoint not registered: ${endpointId}`);
    }

    record.lastSeenAt = input.seenAt;
    record.connectivityState = resolveConnectivityState(record, input.connectivityState);

    return toPublicRecord(record);
  }

  updateEndpointCapabilities(
    input: UpdateEndpointCapabilitiesInput
  ): EndpointRecord {
    const endpointId = normalizeEndpointId(input.endpointId);
    const record = this.endpoints.get(endpointId);
    if (!record) {
      throw new EndpointRegistryError(`Endpoint not registered: ${endpointId}`);
    }

    record.capabilities = validateEndpointCapabilities(input.capabilities);
    record.capabilitiesUpdatedAt = input.updatedAt ?? new Date();

    return toPublicRecord(record);
  }

  upsertProjectedEndpoint(record: EndpointRecord): EndpointRecord {
    const endpointId = normalizeEndpointId(record.endpointId);
    const endpointType = assertEndpointType(record.endpointType);
    const restaurantId = assertRestaurantId(record.restaurantId);
    const displayName = normalizeDisplayName(record.displayName);
    const capabilities = validateEndpointCapabilities(record.capabilities);
    const existing = this.endpoints.get(endpointId);
    const now = new Date();

    const stored: StoredEndpointRecord = {
      endpointId,
      endpointType,
      restaurantId,
      displayName,
      connectivityState: record.connectivityState,
      lastSeenAt: record.lastSeenAt,
      capabilities,
      metadata: record.metadata ? { ...record.metadata } : undefined,
      registeredAt: existing?.registeredAt ?? now,
      capabilitiesUpdatedAt: now,
    };

    this.endpoints.set(endpointId, stored);
    return toPublicRecord(stored);
  }

  getStoredEndpointRecord(endpointId: string): EndpointRecord | undefined {
    const record = this.endpoints.get(normalizeEndpointId(endpointId));
    return record ? toPublicRecord(record) : undefined;
  }

  getEndpoint(endpointId: string): EndpointRecord | undefined {
    const record = this.endpoints.get(normalizeEndpointId(endpointId));
    return record ? hydrateStoredEndpointRecord(toPublicRecord(record)) : undefined;
  }

  listEndpoints(filter?: ListEndpointsFilter): EndpointRecord[] {
    return Array.from(this.endpoints.values())
      .filter((record) => matchesFilter(record, filter))
      .sort((left, right) => left.endpointId.localeCompare(right.endpointId))
      .map((record) => hydrateStoredEndpointRecord(toPublicRecord(record)));
  }

  clear(): void {
    this.endpoints.clear();
  }
}

/** Module-scoped registry for tests and future bootstrap wiring (12E.2B+). */
const defaultRegistry = new InMemoryEndpointRegistry();

export function registerEndpoint(input: RegisterEndpointInput): EndpointRecord {
  return defaultRegistry.registerEndpoint(input);
}

export function updateEndpointHeartbeat(
  input: UpdateEndpointHeartbeatInput
): EndpointRecord {
  return defaultRegistry.updateEndpointHeartbeat(input);
}

export function updateEndpointCapabilities(
  input: UpdateEndpointCapabilitiesInput
): EndpointRecord {
  return defaultRegistry.updateEndpointCapabilities(input);
}

export function upsertProjectedEndpoint(record: EndpointRecord): EndpointRecord {
  return defaultRegistry.upsertProjectedEndpoint(record);
}

export function getStoredEndpointRecord(endpointId: string): EndpointRecord | undefined {
  return defaultRegistry.getStoredEndpointRecord(endpointId);
}

export function getEndpoint(endpointId: string): EndpointRecord | undefined {
  return defaultRegistry.getEndpoint(endpointId);
}

export function listEndpoints(filter?: ListEndpointsFilter): EndpointRecord[] {
  return defaultRegistry.listEndpoints(filter);
}

export function clearEndpointRegistry(): void {
  defaultRegistry.clear();
}

export function createInMemoryEndpointRegistry(): InMemoryEndpointRegistry {
  return new InMemoryEndpointRegistry();
}
