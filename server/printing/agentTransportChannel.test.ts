import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { createAgentChannelRequest } from "./agentChannelRequest";
import {
  NULL_AGENT_TRANSPORT_CHANNEL_ID,
  type AgentTransportChannel,
} from "./agentTransportChannelTypes";
import {
  clearRegisteredAgentTransportChannels,
  getAgentTransportChannel,
  listAgentTransportChannels,
  registerAgentTransportChannel,
  registerDefaultAgentTransportChannels,
} from "./agentTransportChannelRegistry";
import { NullAgentTransportChannel } from "./nullAgentTransportChannel";
import { createPrintAgentRequest } from "./printAgentProtocol";

describe("agentTransportChannelRegistry THERMAL-PRINTING-5D", () => {
  beforeEach(() => {
    clearRegisteredAgentTransportChannels();
    registerDefaultAgentTransportChannels();
  });

  it("registers and resolves channels by id", () => {
    const custom: AgentTransportChannel = {
      channelId: "custom-test-channel",
      send: vi.fn(async () => ({
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        requestId: "req-1",
        accepted: true,
      })),
    };

    registerAgentTransportChannel(custom);

    expect(getAgentTransportChannel("custom-test-channel")).toBe(custom);
    expect(listAgentTransportChannels()).toContain("custom-test-channel");
    expect(listAgentTransportChannels()).toContain(NULL_AGENT_TRANSPORT_CHANNEL_ID);
  });

  it("returns undefined for unknown channel ids", () => {
    expect(getAgentTransportChannel("missing-channel")).toBeUndefined();
  });

  it("lists registered channel ids in sorted order", () => {
    registerAgentTransportChannel({
      channelId: "z-channel",
      send: vi.fn(),
    });
    registerAgentTransportChannel({
      channelId: "a-channel",
      send: vi.fn(),
    });

    expect(listAgentTransportChannels()).toEqual([
      "a-channel",
      NULL_AGENT_TRANSPORT_CHANNEL_ID,
      "z-channel",
    ]);
  });
});

describe("NullAgentTransportChannel THERMAL-PRINTING-5D", () => {
  it("accepts requests and returns success without external communication", async () => {
    const channel = new NullAgentTransportChannel();
    const request = createPrintAgentRequest({
      requestId: "req-null-1",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const response = await channel.send(request);

    expect(response).toEqual({
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      requestId: "req-null-1",
      accepted: true,
    });
  });

  it("preserves request id in the response", async () => {
    const channel = new NullAgentTransportChannel();
    const request = createPrintAgentRequest({
      requestId: "correlation-id-42",
      printJobId: 200,
      restaurantId: 5,
      payloadBase64: "G0AK",
    });

    const response = await channel.send(request);

    expect(response.requestId).toBe(request.requestId);
  });

  it("preserves protocol version in the response", async () => {
    const channel = new NullAgentTransportChannel();
    const request = createPrintAgentRequest({
      requestId: "req-version",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const response = await channel.send(request);

    expect(response.protocolVersion).toBe(request.protocolVersion);
    expect(response.protocolVersion).toBe("1.0");
  });

  it("resolves null channel from registry", async () => {
    clearRegisteredAgentTransportChannels();
    registerDefaultAgentTransportChannels();

    const channel = getAgentTransportChannel(NULL_AGENT_TRANSPORT_CHANNEL_ID);
    expect(channel).toBeDefined();

    const request = createPrintAgentRequest({
      requestId: "registry-req",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    const response = await channel!.send(request);

    expect(response).toEqual({
      protocolVersion: "1.0",
      requestId: "registry-req",
      accepted: true,
    });
  });

  it("correlates response to the same request id", async () => {
    const channel = new NullAgentTransportChannel();
    const first = createPrintAgentRequest({
      requestId: "first-req",
      printJobId: 1,
      restaurantId: 1,
      payloadBase64: "AA==",
    });
    const second = createPrintAgentRequest({
      requestId: "second-req",
      printJobId: 2,
      restaurantId: 1,
      payloadBase64: "AQ==",
    });

    const firstResponse = await channel.send(first);
    const secondResponse = await channel.send(second);

    expect(firstResponse.requestId).toBe("first-req");
    expect(secondResponse.requestId).toBe("second-req");
  });
});

describe("createAgentChannelRequest THERMAL-PRINTING-5D", () => {
  it("maps browser print request fields to print agent request", () => {
    const browserRequest = {
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    };

    const request = createAgentChannelRequest(browserRequest);

    expect(request).toMatchObject(browserRequest);
    expect(request.protocolVersion).toBe("1.0");
    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("preserves explicit request id when provided", () => {
    const request = createAgentChannelRequest({
      requestId: "channel-req-id",
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G2QC",
    });

    expect(request.requestId).toBe("channel-req-id");
  });

  it("does not mutate browser bridge payload fields", () => {
    const browserRequest = {
      printJobId: 100,
      restaurantId: 1,
      payloadBase64: "G0AK",
    };

    const request = createAgentChannelRequest(browserRequest);

    expect(request.payloadBase64).toBe(browserRequest.payloadBase64);
    expect(request.printJobId).toBe(browserRequest.printJobId);
    expect(request.restaurantId).toBe(browserRequest.restaurantId);
  });
});
