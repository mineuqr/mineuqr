import type { ConnectorGatewayService } from "../../../connector-gateway/services/ConnectorGatewayService";
import type { WorkspaceDiscoverPrintersResultDto } from "../contracts/printWorkspaceDiscoveryContracts";

/**
 * PRINT-CONNECTOR-DISCOVERY-1 — distributed printer discovery read projection.
 */
export class PrintWorkspaceDiscoveryReadService {
  constructor(
    private readonly gateway: ConnectorGatewayService,
    private readonly now: () => number = () => Date.now()
  ) {}

  async discoverPrinters(restaurantId: number): Promise<WorkspaceDiscoverPrintersResultDto> {
    const result = await this.gateway.routeDiscoverPrinters({
      restaurantId,
      requestedAt: new Date(this.now()).toISOString(),
    });

    return {
      printers: result.printers ?? [],
      discoveredAt: new Date(this.now()).toISOString(),
      unavailable: !result.routed,
      message: result.message,
    };
  }
}
