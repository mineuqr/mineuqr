import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { HeartbeatManager } from "./heartbeatManager";

describe("heartbeatManager THERMAL-PRINTING-6D", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts and sends periodic heartbeats", () => {
    const sent: string[] = [];
    const manager = new HeartbeatManager({
      agentId: "agent-123",
      sender: { send: (data) => sent.push(data) },
      intervalMs: 1_000,
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    manager.start();
    expect(manager.isRunning()).toBe(true);
    expect(sent).toHaveLength(1);

    vi.advanceTimersByTime(1_000);
    expect(sent).toHaveLength(2);
    expect(JSON.parse(sent[1]!)).toMatchObject({
      type: AGENT_WEBSOCKET_MESSAGE_TYPES.HEARTBEAT,
      agentId: "agent-123",
      timestamp: "2026-06-18T10:00:00.000Z",
    });
  });

  it("does not create duplicate heartbeat loops", () => {
    const sent: string[] = [];
    const manager = new HeartbeatManager({
      agentId: "agent-123",
      sender: { send: (data) => sent.push(data) },
      intervalMs: 1_000,
    });

    manager.start();
    manager.start();
    vi.advanceTimersByTime(1_000);

    expect(sent).toHaveLength(2);
  });

  it("stops heartbeats on shutdown", () => {
    const sent: string[] = [];
    const manager = new HeartbeatManager({
      agentId: "agent-123",
      sender: { send: (data) => sent.push(data) },
      intervalMs: 1_000,
    });

    manager.start();
    manager.stop();
    vi.advanceTimersByTime(2_000);

    expect(manager.isRunning()).toBe(false);
    expect(sent).toHaveLength(1);
  });
});
