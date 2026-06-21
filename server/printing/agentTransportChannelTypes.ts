/**
 * THERMAL-PRINTING-5D — agent transport channel contract (protocol messages only).
 */
import type {
  PrintAgentRequest,
  PrintAgentResponse,
} from "../../shared/printing/printAgentProtocol";

export const NULL_AGENT_TRANSPORT_CHANNEL_ID = "null-channel" as const;

export interface AgentTransportChannel {
  readonly channelId: string;

  send(request: PrintAgentRequest): Promise<PrintAgentResponse>;
}
