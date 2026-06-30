import type {
  ConnectorHealth,
  ConnectorHeartbeat,
  ConnectorSession,
  ConnectorStatus,
} from "../contracts/gatewayContracts";
import type { ConnectorRegistryRepository } from "../contracts/ConnectorRegistryRepository";

const DEGRADED_AFTER_MS = 30_000;
const OFFLINE_AFTER_MS = 90_000;

function availabilityFromAge(ageMs: number | null): ConnectorStatus["availability"] {
  if (ageMs == null) return "offline";
  if (ageMs > OFFLINE_AFTER_MS) return "offline";
  if (ageMs > DEGRADED_AFTER_MS) return "degraded";
  return "online";
}

/**
 * Heartbeat ingestion and connector health evaluation (ADR-ARCH-016).
 */
export class ConnectorHealthService {
  constructor(
    private readonly repository: ConnectorRegistryRepository,
    private readonly now: () => number = () => Date.now()
  ) {}

  evaluate(session: ConnectorSession, at: number = this.now()): ConnectorHealth {
    const lastSeenAt = session.runtime.lastHeartbeatAt ?? session.runtime.registeredAt;
    const heartbeatAgeMs = lastSeenAt ? at - Date.parse(lastSeenAt) : null;
    const availability = availabilityFromAge(heartbeatAgeMs);

    const status: ConnectorStatus = {
      availability,
      isRegistered: true,
      isHealthy: availability === "online",
      lastSeenAt,
      message:
        availability === "online"
          ? null
          : availability === "degraded"
            ? "Connector heartbeat delayed"
            : "Connector offline",
    };

    return {
      identity: session.identity,
      status,
      heartbeatAgeMs,
      evaluatedAt: new Date(at).toISOString(),
    };
  }

  async recordHeartbeat(heartbeat: ConnectorHeartbeat): Promise<ConnectorSession | null> {
    const session = await this.repository.findByInstance(heartbeat.connectorInstanceId);
    if (!session || session.identity.restaurantId !== heartbeat.restaurantId) {
      return null;
    }

    const updated: ConnectorSession = {
      ...session,
      runtime: {
        ...session.runtime,
        lastHeartbeatAt: heartbeat.receivedAt,
      },
      status: {
        ...session.status,
        availability: "online",
        isHealthy: true,
        lastSeenAt: heartbeat.receivedAt,
        message: null,
      },
    };

    await this.repository.save(updated);
    return updated;
  }
}
