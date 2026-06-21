/**
 * THERMAL-PRINTING-6D — periodic heartbeat sender.
 */
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

export type HeartbeatSender = {
  send(data: string): void;
};

export type HeartbeatManagerOptions = {
  agentId: string;
  sender: HeartbeatSender;
  intervalMs?: number;
  now?: () => Date;
};

export class HeartbeatManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly now: () => Date;

  constructor(private readonly options: HeartbeatManagerOptions) {
    this.intervalMs = options.intervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS;
    this.now = options.now ?? (() => new Date());
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.sendHeartbeat();
    this.timer = setInterval(() => {
      this.sendHeartbeat();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private sendHeartbeat(): void {
    const timestamp = this.now().toISOString();
    this.options.sender.send(
      JSON.stringify({
        type: AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: this.options.agentId,
        timestamp,
      })
    );
  }
}
