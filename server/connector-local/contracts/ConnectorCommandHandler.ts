import type { ConnectorCommandEnvelope, ConnectorCommandResponse } from "../../connector-session/contracts/sessionContracts";

/**
 * Dispatches inbound gateway commands — platform print/discovery deferred to later programs.
 */
export interface ConnectorCommandHandler {
  handle(command: ConnectorCommandEnvelope): Promise<ConnectorCommandResponse>;
}
