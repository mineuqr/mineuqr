import type { PlatformAdapter } from "../../print-connector/contracts/PlatformAdapter";
import type { PrintConnectorApi } from "../../print-connector/contracts/PrintConnectorApi";
import type { LocalConnectorHealthSnapshot } from "../contracts/localContracts";
import { LocalConnectorRuntimeFacade } from "../services/LocalConnectorRuntimeFacade";

export type WindowsRuntimeDiagnosticsSnapshot = {
  platform: "windows";
  installedPrinters: Awaited<ReturnType<LocalConnectorRuntimeFacade["discoverPrinters"]>>;
  selectedPrinter: Awaited<ReturnType<LocalConnectorRuntimeFacade["getSelectedPrinter"]>>;
  defaultPrinter: string | null;
  hostProcessPlatform: string;
  rlcRuntime: boolean;
  connectorHealth: LocalConnectorHealthSnapshot;
};

export class WindowsRuntimeDiagnostics {
  constructor(
    private readonly runtime: PrintConnectorApi,
    private readonly platformAdapter: PlatformAdapter
  ) {}

  async snapshot(
    restaurantId: number,
    connectorHealth: LocalConnectorHealthSnapshot
  ): Promise<WindowsRuntimeDiagnosticsSnapshot> {
    const facade = new LocalConnectorRuntimeFacade(this.runtime);

    const installedPrinters = await facade.discoverPrinters(restaurantId);
    const selectedPrinter = await facade.getSelectedPrinter(restaurantId);
    const defaultPrinter = installedPrinters.find((p) => p.isDefault)?.name ?? null;

    return {
      platform: "windows",
      installedPrinters,
      selectedPrinter,
      defaultPrinter,
      hostProcessPlatform: process.platform,
      rlcRuntime: process.env.RLC_RUNTIME === "1",
      connectorHealth,
    };
  }
}
