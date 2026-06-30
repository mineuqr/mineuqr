import type { ConnectorCommandEnvelope, ConnectorCommandResponse } from "../../connector-session/contracts/sessionContracts";
import type { ConnectorCommandHandler } from "../contracts/ConnectorCommandHandler";

/**
 * Transport-only command handler — printer discovery/execution deferred.
 */
export class DeferredConnectorCommandHandler implements ConnectorCommandHandler {
  async handle(command: ConnectorCommandEnvelope): Promise<ConnectorCommandResponse> {
    return {
      commandId: command.commandId,
      success: true,
      failureCode: null,
      message: null,
      payload: {
        deferred: true,
        commandType: command.type,
        reason: "platform_execution_deferred",
      },
    };
  }
}
