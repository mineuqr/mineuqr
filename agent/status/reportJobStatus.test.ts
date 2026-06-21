import { describe, expect, it } from "vitest";
import { AGENT_PROTOCOL_STATUS_MESSAGE_TYPES } from "../../shared/printing/agentProtocolStatusMessages";
import {
  buildJobStatusReportMessage,
  reportJobStatus,
  JobStatusReportError,
  JobStatusReportTracker,
} from "./reportJobStatus";

describe("reportJobStatus THERMAL-PRINTING-7E.3", () => {
  it("builds job status report messages with string jobId", () => {
    expect(
      buildJobStatusReportMessage({
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "delivered",
      })
    ).toMatchObject({
      type: AGENT_PROTOCOL_STATUS_MESSAGE_TYPES.JOB_STATUS_REPORT,
      agentId: "agent-123",
      jobId: "100",
      state: "delivered",
    });
  });

  it("reports job state changes once per state", () => {
    const sent: string[] = [];
    const tracker = new JobStatusReportTracker();

    const first = reportJobStatus({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "prepared",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const duplicate = reportJobStatus({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
        state: "prepared",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });
    const next = reportJobStatus({
      payload: {
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:02.000Z",
        state: "delivered",
      },
      sender: { send: (data) => sent.push(data) },
      tracker,
    });

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(next).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it("rejects invalid job lifecycle states", () => {
    expect(() =>
      buildJobStatusReportMessage({
        agentId: "agent-123",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
        state: "printed" as "delivered",
      })
    ).toThrow(JobStatusReportError);
  });
});
