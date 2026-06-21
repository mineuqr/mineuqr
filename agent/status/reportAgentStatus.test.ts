import { describe, expect, it } from "vitest";
import { AGENT_PROTOCOL_STATUS_MESSAGE_TYPES } from "../../shared/printing/agentProtocolStatusMessages";
import {
  buildAgentStatusReportMessage,
  reportAgentStatus,
  AgentStatusReportError,
  AgentStatusReportTracker,
} from "./reportAgentStatus";

describe("reportAgentStatus THERMAL-PRINTING-7E.2", () => {
  it("builds agent status report messages", () => {
    expect(
      buildAgentStatusReportMessage({
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "ready",
      })
    ).toMatchObject({
      type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.AGENT_STATUS_REPORT,
      agentId: "agent-123",
      state: "ready",
    });
  });

  it("reports lifecycle changes once per state", () => {
    const sent: string[] = [];
    const tracker = new AgentStatusReportTracker();

    const first = reportAgentStatus({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "ready",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const duplicate = reportAgentStatus({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:01.000Z",
        state: "ready",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const next = reportAgentStatus({
      payload: {
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:02.000Z",
        state: "offline",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(next).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it("rejects invalid lifecycle states", () => {
    expect(() =>
      buildAgentStatusReportMessage({
        agentId: "agent-123",
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "printed" as "ready",
      })
    ).toThrow(AgentStatusReportError);
  });
});
