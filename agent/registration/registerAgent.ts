/**
 * THERMAL-PRINTING-6D — registration handshake (wire protocol via shared contracts).
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import type { AgentLocalIdentity } from "../identity/identityStore";
import type { AgentRegistrationPayload, AgentRegistrationResult } from "./registrationTypes";

export const REFERENCE_AGENT_VERSION = "1.0.0-phase1";

export type BuildRegistrationPayloadInput = {
  identity: AgentLocalIdentity;
  platform: AgentPlatform;
  version?: string;
};

export function buildRegistrationPayload(
  input: BuildRegistrationPayloadInput
): AgentRegistrationPayload {
  return {
    agentId: input.identity.agentId,
    agentName: input.identity.agentName,
    version: input.version ?? REFERENCE_AGENT_VERSION,
    platform: input.platform,
  };
}

export type AgentWireSender = {
  send(data: string): void;
};

export function buildAgentHelloWireMessage(input: {
  payload: AgentRegistrationPayload;
  platform: AgentPlatform;
}) {
  return {
    type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
    protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    agentId: input.payload.agentId,
    platform: input.platform,
    capabilities: {
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      platform: input.platform,
      transports: ["websocket"],
      printers: 0,
    },
  };
}

export function registerAgentWithServer(input: {
  sender: AgentWireSender;
  identity: AgentLocalIdentity;
  platform: AgentPlatform;
  version?: string;
}): AgentRegistrationResult {
  const payload = buildRegistrationPayload({
    identity: input.identity,
    platform: input.platform,
    version: input.version,
  });

  const wireMessage = buildAgentHelloWireMessage({
    payload,
    platform: input.platform,
  });

  input.sender.send(JSON.stringify(wireMessage));

  return {
    payload,
    registeredAt: new Date().toISOString(),
  };
}
