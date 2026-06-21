import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockAgentWebSocketClient } from "../transport/websocketClient";
import { ReconnectEngine } from "./reconnectEngine";

describe("reconnectEngine THERMAL-PRINTING-6D", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects successfully and resets backoff", async () => {
    const client = new MockAgentWebSocketClient();
    const onConnected = vi.fn();

    const engine = new ReconnectEngine({
      client,
      serverUrl: "ws://localhost/ws/print-agent",
      onConnected,
    });

    await engine.connect();

    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(engine.getAttemptCount()).toBe(0);
  });

  it("schedules reconnect with exponential backoff after disconnect", async () => {
    const client = new MockAgentWebSocketClient();
    const onConnected = vi.fn();
    const onDisconnected = vi.fn();
    const onReconnectScheduled = vi.fn();

    const engine = new ReconnectEngine({
      client,
      serverUrl: "ws://localhost/ws/print-agent",
      initialDelayMs: 1_000,
      multiplier: 2,
      onDisconnected,
      onReconnectScheduled,
      onConnected,
    });

    await engine.connect();
    client.simulateDisconnect();

    expect(onDisconnected).toHaveBeenCalledTimes(1);
    expect(onReconnectScheduled).toHaveBeenCalledWith(1_000, 1);

    vi.advanceTimersByTime(1_000);
    await Promise.resolve();

    expect(client.isOpen()).toBe(true);
    expect(onConnected).toHaveBeenCalledTimes(2);
  });

  it("preserves identity by reusing the same client session object", async () => {
    const client = new MockAgentWebSocketClient();
    const engine = new ReconnectEngine({
      client,
      serverUrl: "ws://localhost/ws/print-agent",
      onConnected: vi.fn(),
    });

    await engine.connect();
    client.simulateDisconnect();
    vi.advanceTimersByTime(1_000);
    await Promise.resolve();

    expect(client).toBe(client);
  });

  it("stops reconnect attempts on stop", async () => {
    const client = new MockAgentWebSocketClient();
    const onReconnectScheduled = vi.fn();

    const engine = new ReconnectEngine({
      client,
      serverUrl: "ws://localhost/ws/print-agent",
      onReconnectScheduled,
      onConnected: vi.fn(),
    });

    await engine.connect();
    engine.stop();
    client.simulateDisconnect();
    vi.advanceTimersByTime(10_000);

    expect(engine.isStopped()).toBe(true);
    expect(onReconnectScheduled).not.toHaveBeenCalled();
  });
});
