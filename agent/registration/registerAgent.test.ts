import { describe, expect, it } from "vitest";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  buildAgentHelloWireMessage,
  buildRegistrationPayload,
  registerAgentWithServer,
} from "./registerAgent";

describe("agent registration THERMAL-PRINTING-6D", () => {
  const identity = {
    agentId: "agent-123",
    agentName: "Kitchen Printer",
    createdAt: "2026-06-18T10:00:00.000Z",
  };

  it("builds local registration payload", () => {
    expect(
      buildRegistrationPayload({
        identity,
        platform: "windows",
      })
    ).toEqual({
      agentId: "agent-123",
      agentName: "Kitchen Printer",
      version: "1.0.0-phase1",
      platform: "windows",
    });
  });

  it("reuses the same agentId on reconnect registration", () => {
    const payload = buildRegistrationPayload({
      identity,
      platform: "android",
    });

    expect(payload.agentId).toBe(identity.agentId);
  });

  it("maps registration payload to shared hello wire message", () => {
    const payload = buildRegistrationPayload({
      identity,
      platform: "ios",
    });

    expect(buildAgentHelloWireMessage({ payload, platform: "ios" })).toEqual({
      type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      agentId: "agent-123",
      platform: "ios",
      capabilities: {
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        platform: "ios",
        transports: ["websocket"],
        printers: 0,
      },
    });
  });

  it("sends hello over the wire sender", () => {
    const sent: string[] = [];
    registerAgentWithServer({
      sender: { send: (data) => sent.push(data) },
      identity,
      platform: "windows",
    });

    expect(JSON.parse(sent[0]!)).toMatchObject({
      type: AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO,
      agentId: "agent-123",
    });
  });
});
