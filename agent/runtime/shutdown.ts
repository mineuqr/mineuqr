/**
 * THERMAL-PRINTING-6D — graceful reference agent shutdown.
 */
import type { AgentRuntime } from "./runtimeTypes";

export async function shutdownAgent(runtime: AgentRuntime): Promise<void> {
  const state = runtime.lifecycle.getState();
  if (state === "stopping" || state === "offline") {
    return;
  }

  runtime.lifecycle.transition("stopping");
  runtime.heartbeat.stop();
  runtime.reconnect.stop();
  runtime.client.close();
  runtime.lifecycle.transition("offline");
}
