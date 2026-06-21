/**
 * THERMAL-PRINTING-6D — resilient reconnect with exponential backoff.
 */
import type { AgentWebSocketClient } from "../transport/websocketClient";

export const DEFAULT_RECONNECT_INITIAL_DELAY_MS = 1_000;
export const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;
export const DEFAULT_RECONNECT_MULTIPLIER = 2;

export type ReconnectEngineOptions = {
  client: AgentWebSocketClient;
  serverUrl: string;
  initialDelayMs?: number;
  maxDelayMs?: number;
  multiplier?: number;
  onConnecting?: () => void;
  onConnected?: () => void | Promise<void>;
  onDisconnected?: () => void;
  onReconnectScheduled?: (delayMs: number, attempt: number) => void;
  onMessage?: (data: string) => void;
  sleep?: (delayMs: number) => Promise<void>;
};

export class ReconnectEngine {
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly multiplier: number;
  private readonly sleep: (delayMs: number) => Promise<void>;

  private attempt = 0;
  private currentDelayMs: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private connecting = false;

  constructor(private readonly options: ReconnectEngineOptions) {
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_RECONNECT_INITIAL_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS;
    this.multiplier = options.multiplier ?? DEFAULT_RECONNECT_MULTIPLIER;
    this.currentDelayMs = this.initialDelayMs;
    this.sleep =
      options.sleep ??
      ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));

    this.options.client.setHandlers({
      onClose: () => {
        this.handleDisconnect();
      },
      onError: () => {
        // close handler performs cleanup
      },
      onMessage: (data) => {
        this.options.onMessage?.(data);
      },
    });
  }

  getAttemptCount(): number {
    return this.attempt;
  }

  getCurrentDelayMs(): number {
    return this.currentDelayMs;
  }

  isStopped(): boolean {
    return this.stopped;
  }

  async connect(): Promise<void> {
    if (this.stopped) {
      throw new Error("Reconnect engine is stopped");
    }

    await this.openConnection(false);
  }

  scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    this.attempt += 1;
    this.options.onReconnectScheduled?.(this.currentDelayMs, this.attempt);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openConnection(true);
    }, this.currentDelayMs);

    this.currentDelayMs = Math.min(this.currentDelayMs * this.multiplier, this.maxDelayMs);
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.options.client.close();
  }

  private async openConnection(isReconnect: boolean): Promise<void> {
    if (this.stopped || this.connecting) {
      return;
    }

    this.connecting = true;
    this.options.onConnecting?.();

    try {
      await this.options.client.connect(this.options.serverUrl);
      this.attempt = 0;
      this.currentDelayMs = this.initialDelayMs;
      await this.options.onConnected?.();
    } catch {
      if (!this.stopped) {
        this.scheduleReconnect();
      }
    } finally {
      this.connecting = false;
    }

    if (isReconnect && !this.stopped && !this.options.client.isOpen()) {
      this.scheduleReconnect();
    }
  }

  private handleDisconnect(): void {
    if (this.stopped) {
      return;
    }

    this.options.onDisconnected?.();
    this.scheduleReconnect();
  }
}
