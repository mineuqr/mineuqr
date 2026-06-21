/**
 * THERMAL-PRINTING-6B — inbound WebSocket message dispatch (lifecycle integration only).
 */
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import {
  getAgentConnectivityState,
  recordAgentHeartbeat,
  registerPrintAgent,
  unregisterPrintAgent,
} from "./agentLifecycleService";
import {
  getConnection,
  registerConnection,
  type AgentWebSocketConnection,
  unregisterConnection,
} from "./agentConnectionManager";
import {
  AGENT_JOB_MESSAGE_TYPES,
  validateAgentJobDeliveryConfirmedPayload,
  type AgentJobDeliveryAckMessage,
  type AgentJobDeliveryConfirmedMessage,
  type AgentJobFetchRequestMessage,
} from "../../shared/printing/agentJobMessages";
import {
  AGENT_PROTOCOL_STATUS_MESSAGE_TYPES,
  validateAgentJobStatusReportPayload,
  validateAgentStatusReportPayload,
  type AgentJobStatusReportMessage,
  type AgentStatusReportMessage,
} from "../../shared/printing/agentProtocolStatusMessages";
import { tryParseAgentPlatformCapabilityInboundMessage } from "./agentPlatformCapabilityWireCodec";
import { tryParseAgentProtocolStatusInboundMessage } from "./agentProtocolStatusWireCodec";
import { tryParseAgentPrinterProfileInboundMessage } from "./agentPrinterProfileWireCodec";
import { recordAgentStatusReport } from "./agentStatusService";
import { tryParseAgentJobInboundMessage } from "./agentJobWireCodec";
import { recordDeliveryAcknowledgement } from "./deliveryAckService";
import { processAgentDeliveryConfirmation } from "./deliveryConfirmationFlow";
import { recordJobStatusReport } from "./jobStatusService";
import { processAgentPlatformCapabilitiesReport } from "./platformCapabilityNegotiationFlow";
import { processAgentPrinterProfilesReport } from "./printerProfileNegotiationFlow";
import { handleAgentJobFetchRequest } from "./jobRetrievalRouter";
import { parseAgentWebSocketMessage } from "./agentWebSocketMessageCodec";
import {
  clearPendingRequestsForAgent,
  resolvePending,
} from "./pendingRequestRegistry";

export class AgentWebSocketInboundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentWebSocketInboundError";
  }
}

export function handleAgentWebSocketInboundMessage(
  rawMessage: string,
  connection: AgentWebSocketConnection
): void | Promise<void> {
  const platformCapabilityMessage =
    tryParseAgentPlatformCapabilityInboundMessage(rawMessage);
  if (platformCapabilityMessage) {
    processAgentPlatformCapabilitiesReport({
      agentId: platformCapabilityMessage.agentId,
      timestamp: platformCapabilityMessage.timestamp,
      platform: platformCapabilityMessage.platform,
      capabilities: platformCapabilityMessage.capabilities,
    });
    return;
  }

  const printerProfileMessage = tryParseAgentPrinterProfileInboundMessage(rawMessage);
  if (printerProfileMessage) {
    processAgentPrinterProfilesReport({
      agentId: printerProfileMessage.agentId,
      timestamp: printerProfileMessage.timestamp,
      printers: printerProfileMessage.printers,
    });
    return;
  }

  const statusMessage = tryParseAgentProtocolStatusInboundMessage(rawMessage);
  if (statusMessage) {
    return handleAgentProtocolStatusInboundMessage(statusMessage);
  }

  const jobMessage = tryParseAgentJobInboundMessage(rawMessage);
  if (jobMessage) {
    return handleAgentJobInboundMessage(jobMessage, connection);
  }

  const message = parseAgentWebSocketMessage(rawMessage);

  switch (message.type) {
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO:
      registerPrintAgent({
        identity: {
          agentId: message.agentId,
          platform: message.platform,
          protocolVersion: message.protocolVersion,
        },
        capabilities: message.capabilities,
      });
      registerConnection(message.agentId, connection);
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT:
      recordAgentHeartbeat({
        agentId: message.agentId,
        protocolVersion: message.protocolVersion,
        timestamp: message.timestamp,
      });
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_RESPONSE:
      resolvePending(message.response.requestId, message.response);
      return;
    case AGENT_WEBSOCKET_MESSAGE_TYPES.PRINT_REQUEST:
      throw new AgentWebSocketInboundError(
        "Print requests are outbound-only on the WebSocket channel"
      );
    default:
      throw new AgentWebSocketInboundError("Unsupported WebSocket message type");
  }
}

async function handleAgentJobInboundMessage(
  message:
    | AgentJobFetchRequestMessage
    | AgentJobDeliveryAckMessage
    | AgentJobDeliveryConfirmedMessage,
  connection: AgentWebSocketConnection
): Promise<void> {
  if (message.type === AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST) {
    await handleAgentJobFetchRequest(message, connection);
    return;
  }

  if (message.type === AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK) {
    await recordDeliveryAcknowledgement({
      agentId: message.agentId,
      jobId: message.jobId,
      timestamp: message.timestamp,
    });
    return;
  }

  const payload = validateAgentJobDeliveryConfirmedPayload({
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
  });
  await processAgentDeliveryConfirmation(payload);
}

async function handleAgentProtocolStatusInboundMessage(
  message: AgentStatusReportMessage | AgentJobStatusReportMessage
): Promise<void> {
  if (message.type === AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT) {
    const payload = validateAgentStatusReportPayload({
      agentId: message.agentId,
      timestamp: message.timestamp,
      state: message.state,
    });
    recordAgentStatusReport(payload);
    return;
  }

  const payload = validateAgentJobStatusReportPayload({
    agentId: message.agentId,
    jobId: message.jobId,
    timestamp: message.timestamp,
    state: message.state,
  });
  await recordJobStatusReport(payload);
}

export function handleAgentWebSocketDisconnect(agentId: string): void {
  clearPendingRequestsForAgent(agentId);
  unregisterConnection(agentId);
  unregisterPrintAgent(agentId);
}

export function getConnectedAgentConnectivityState(agentId: string) {
  if (!getConnection(agentId)) {
    return undefined;
  }

  return getAgentConnectivityState(agentId);
}
