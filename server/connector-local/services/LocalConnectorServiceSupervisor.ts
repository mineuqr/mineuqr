import type { LocalConnectorBootstrapResult } from "./LocalConnectorBootstrap";
import { LocalConnectorBootstrap } from "./LocalConnectorBootstrap";
import type { LocalConnectorHost } from "./LocalConnectorHost";

export type ServiceSupervisorSnapshot = {
  productName: string;
  version: string;
  enrolled: boolean;
  lifecycle: string;
  connectionStatus: "connected" | "connecting" | "disconnected" | "stopped";
  serviceStatus: "running" | "restarting" | "stopped";
  lastError: string | null;
  reconnectAttempt: number;
  startedAt: string | null;
};

export type ServiceSupervisorOptions = {
  bootstrap: LocalConnectorBootstrap;
  productName: string;
  version: string;
  enrolled: boolean;
  onLog?: (line: string) => void;
};

/**
 * Runs RLC with automatic reconnect and graceful shutdown.
 */
export class LocalConnectorServiceSupervisor {
  private host: LocalConnectorHost | null = null;
  private session: LocalConnectorBootstrapResult | null = null;
  private shuttingDown = false;
  private reconnectAttempt = 0;
  private lastError: string | null = null;
  private startedAt: string | null = null;
  private serviceStatus: ServiceSupervisorSnapshot["serviceStatus"] = "stopped";
  private disconnectWaiter: (() => void) | null = null;

  constructor(private readonly options: ServiceSupervisorOptions) {}

  getSnapshot(): ServiceSupervisorSnapshot {
    const lifecycle = this.host?.getLifecycle() ?? "stopped";
    let connectionStatus: ServiceSupervisorSnapshot["connectionStatus"] = "stopped";
    if (this.serviceStatus === "running") {
      connectionStatus =
        lifecycle === "healthy" || lifecycle === "registered" || lifecycle === "degraded"
          ? "connected"
          : lifecycle === "connecting" || lifecycle === "authenticating"
            ? "connecting"
            : "disconnected";
    }

    return {
      productName: this.options.productName,
      version: this.options.version,
      enrolled: this.options.enrolled,
      lifecycle,
      connectionStatus,
      serviceStatus: this.serviceStatus,
      lastError: this.lastError,
      reconnectAttempt: this.reconnectAttempt,
      startedAt: this.startedAt,
    };
  }

  async runForever(): Promise<void> {
    this.shuttingDown = false;
    this.serviceStatus = "running";

    while (!this.shuttingDown) {
      try {
        this.log("Starting MineuQR Connector service…");
        const host = this.options.bootstrap.createHost();
        this.host = host;
        this.session = await this.options.bootstrap.start(host);
        this.startedAt = new Date().toISOString();
        this.reconnectAttempt = 0;
        this.lastError = null;
        this.log("Connector connected and registered.");

        const transport = this.session.sessionClient.getState().transport;
        if (transport) {
          await new Promise<void>((resolve) => {
            this.disconnectWaiter = resolve;
            transport.onDisconnect(() => resolve());
          });
        } else {
          await delay(5_000);
        }
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        this.log(`Connector start failed: ${this.lastError}`);
      }

      if (this.shuttingDown) break;

      await this.stopSession();
      this.serviceStatus = "restarting";
      this.reconnectAttempt += 1;
      const policy = this.options.bootstrap.getReconnectPolicy();
      if (!policy.shouldRetry(this.reconnectAttempt)) {
        this.log("Maximum reconnect attempts reached.");
        break;
      }
      const waitMs = policy.nextDelayMs(this.reconnectAttempt);
      this.log(`Reconnecting in ${Math.round(waitMs / 1000)}s…`);
      await delay(waitMs);
    }

    this.serviceStatus = "stopped";
    await this.stopSession();
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.disconnectWaiter?.();
    await this.stopSession();
    this.serviceStatus = "stopped";
  }

  private async stopSession(): Promise<void> {
    if (this.session) {
      try {
        await this.options.bootstrap.stop(this.session);
      } catch {
        // best effort
      }
    }
    this.session = null;
    this.host = null;
    this.disconnectWaiter = null;
  }

  private log(line: string): void {
    this.options.onLog?.(line);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
