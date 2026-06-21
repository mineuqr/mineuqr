/**
 * THERMAL-PRINTING-5D — no-op agent channel for tests and lifecycle validation.
 */
import type { PrintAgentRequest, PrintAgentResponse } from "../../shared/printing/printAgentProtocol";
import {
  NULL_AGENT_TRANSPORT_CHANNEL_ID,
  type AgentTransportChannel,
} from "./agentTransportChannelTypes";
import { createPrintAgentResponse } from "./printAgentProtocol";

export class NullAgentTransportChannel implements AgentTransportChannel {
  readonly channelId = NULL_AGENT_TRANSPORT_CHANNEL_ID;

  async send(request: PrintAgentRequest): Promise<PrintAgentResponse> {
    return createPrintAgentResponse({
      protocolVersion: request.protocolVersion,
      requestId: request.requestId,
      accepted: true,
    });
  }
}

export const nullAgentTransportChannel = new NullAgentTransportChannel();
