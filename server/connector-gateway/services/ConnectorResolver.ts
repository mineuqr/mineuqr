import type { ConnectorSession } from "../contracts/gatewayContracts";
import type { ConnectorRegistry } from "./ConnectorRegistry";
import type { ConnectorHealthService } from "./ConnectorHealthService";

export type ConnectorResolveResult = {
  session: ConnectorSession | null;
  reason: "found" | "unregistered" | "offline" | "degraded";
};

/**
 * Resolves the active connector for a restaurant.
 */
export class ConnectorResolver {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly health: ConnectorHealthService
  ) {}

  async resolve(restaurantId: number): Promise<ConnectorResolveResult> {
    const session = await this.registry.getSession(restaurantId);
    if (!session) {
      return { session: null, reason: "unregistered" };
    }

    const health = this.health.evaluate(session);
    if (health.status.availability === "offline") {
      return { session, reason: "offline" };
    }
    if (health.status.availability === "degraded") {
      return { session, reason: "degraded" };
    }

    return { session, reason: "found" };
  }
}
