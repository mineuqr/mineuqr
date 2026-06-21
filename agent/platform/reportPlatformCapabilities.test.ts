import { describe, expect, it } from "vitest";
import { AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES } from "../../shared/printing/platformCapabilities";
import {
  buildPlatformCapabilitiesReportMessage,
  reportPlatformCapabilities,
  PlatformCapabilitiesReportTracker,
  WINDOWS_PLATFORM_CAPABILITIES,
} from "./reportPlatformCapabilities";

describe("reportPlatformCapabilities THERMAL-PRINTING-8C.2", () => {
  it("builds platform capability report messages", () => {
    expect(
      buildPlatformCapabilitiesReportMessage({
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        capabilities: WINDOWS_PLATFORM_CAPABILITIES,
      })
    ).toMatchObject({
      type: AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT,
      agentId: "agent-123",
      platform: "windows",
      capabilities: {
        transports: WINDOWS_PLATFORM_CAPABILITIES.transports,
        execution: WINDOWS_PLATFORM_CAPABILITIES.execution,
      },
    });
  });

  it("reports capabilities once per identical snapshot", () => {
    const sent: string[] = [];
    const tracker = new PlatformCapabilitiesReportTracker();

    const first = reportPlatformCapabilities({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        capabilities: WINDOWS_PLATFORM_CAPABILITIES,
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const duplicate = reportPlatformCapabilities({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:01.000Z",
        capabilities: WINDOWS_PLATFORM_CAPABILITIES,
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
