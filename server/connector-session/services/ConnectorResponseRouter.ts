import type { ConnectorCommandResponse } from "../contracts/sessionContracts";
import type { InfrastructureFailureCode } from "../contracts/sessionFailureContracts";

type PendingCommand = {
  resolve: (response: ConnectorCommandResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * Correlates inbound command responses to outbound requests.
 */
export class ConnectorResponseRouter {
  private readonly pending = new Map<string, PendingCommand>();

  awaitResponse(commandId: string, timeoutMs: number): Promise<ConnectorCommandResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(commandId);
        reject(new Error("command_timeout"));
      }, timeoutMs);

      this.pending.set(commandId, { resolve, reject, timeout });
    });
  }

  route(response: ConnectorCommandResponse): boolean {
    const pending = this.pending.get(response.commandId);
    if (!pending) return false;
    clearTimeout(pending.timeout);
    this.pending.delete(response.commandId);
    pending.resolve(response);
    return true;
  }

  failAll(code: InfrastructureFailureCode, message: string): void {
    for (const [commandId, pending] of Array.from(this.pending.entries())) {
      clearTimeout(pending.timeout);
      this.pending.delete(commandId);
      pending.resolve({
        commandId,
        success: false,
        failureCode: code,
        message,
        payload: null,
      });
    }
  }
}
