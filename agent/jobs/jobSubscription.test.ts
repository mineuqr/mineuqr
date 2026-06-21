import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import {
  JobSubscription,
  JobSubscriptionError,
  parseJobAssignedNotification,
} from "./jobSubscription";
import { serializeJobAssignedNotification } from "./jobWire";

describe("jobSubscription THERMAL-PRINTING-6D Phase-2", () => {
  const agentId = "agent-123";

  it("parses valid job assignment notifications", () => {
    const raw = serializeJobAssignedNotification({
      agentId,
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    expect(parseJobAssignedNotification(raw)).toMatchObject({
      type: AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED,
      agentId,
      jobId: 100,
    });
  });

  it("rejects invalid notification payloads", () => {
    expect(() => parseJobAssignedNotification("{bad-json")).toThrow(JobSubscriptionError);
    expect(() =>
      parseJobAssignedNotification(
        JSON.stringify({ type: "agent.heartbeat", protocolVersion: "1.0" })
      )
    ).toThrow(JobSubscriptionError);
  });

  it("ignores unrelated transport messages", () => {
    const events: number[] = [];
    const subscription = new JobSubscription({
      agentId,
      listeners: [(event) => events.push(event.jobId)],
    });

    expect(
      subscription.handleTransportMessage(
        JSON.stringify({ type: "agent.heartbeat", protocolVersion: "1.0" })
      )
    ).toBe(false);
    expect(events).toEqual([]);
  });

  it("ignores notifications for other agents", () => {
    const events: number[] = [];
    const subscription = new JobSubscription({ agentId });

    subscription.onJobAssigned((event) => events.push(event.jobId));
    subscription.handleTransportMessage(
      serializeJobAssignedNotification({
        agentId: "other-agent",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      })
    );

    expect(events).toEqual([]);
  });

  it("deduplicates duplicate notifications", () => {
    const events: number[] = [];
    const subscription = new JobSubscription({ agentId });
    subscription.onJobAssigned((event) => events.push(event.jobId));

    const raw = serializeJobAssignedNotification({
      agentId,
      jobId: 100,
      timestamp: "2026-06-18T10:00:00.000Z",
    });

    subscription.handleTransportMessage(raw);
    subscription.handleTransportMessage(raw);

    expect(events).toEqual([100]);
  });
});
