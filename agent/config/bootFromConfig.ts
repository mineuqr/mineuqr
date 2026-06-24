/**
 * THERMAL-PRINTING-12B — production boot from validated deployment configuration.
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { createIdentity } from "../identity/createIdentity";
import { FileIdentityStore, type IdentityStore } from "../identity/identityStore";
import type { AgentPrinterBindingReportPayload } from "../../shared/printing/printerBindingReport";
import { bootAgent } from "../runtime/boot";
import type { AgentRuntime } from "../runtime/runtimeTypes";
import type { AgentWebSocketClient } from "../transport/websocketClient";
import type { AgentDeploymentConfig } from "./types";
import { AgentDeploymentConfigError } from "./validateDeploymentConfig";

export const DEFAULT_IDENTITY_STORE_PATH = join(
  homedir(),
  ".mineuqr",
  "print-agent",
  "identity.json"
);

function resolveIdentityStorePath(config: AgentDeploymentConfig): string {
  return config.identityStorePath?.trim() || DEFAULT_IDENTITY_STORE_PATH;
}

async function ensureDeploymentIdentity(
  config: AgentDeploymentConfig,
  identityStore: IdentityStore
): Promise<void> {
  const existing = await identityStore.load();
  if (!existing) {
    await identityStore.save(
      createIdentity({
        agentId: config.agentId,
        agentName: config.agentName,
      })
    );
    return;
  }

  if (existing.agentId !== config.agentId) {
    throw new AgentDeploymentConfigError(
      "Configured agentId does not match persisted identity",
      [
        `config agentId: ${config.agentId}`,
        `identity file agentId: ${existing.agentId}`,
        "Delete the identity file or align agentId in configuration",
      ]
    );
  }
}

export async function bootAgentFromDeploymentConfig(
  config: AgentDeploymentConfig,
  options: {
    client?: AgentWebSocketClient;
    identityStore?: IdentityStore;
    bindingStatusProvider?: () => Promise<AgentPrinterBindingReportPayload | null>;
  } = {}
): Promise<AgentRuntime> {
  const identityStore =
    options.identityStore ?? new FileIdentityStore(resolveIdentityStorePath(config));
  await ensureDeploymentIdentity(config, identityStore);

  return bootAgent({
    serverUrl: config.serverUrl,
    agentName: config.agentName,
    platform: config.platform,
    identityStore,
    client: options.client,
    startupPrinters: config.startupPrinters,
    usbTransportEndpoints: config.usbTransportEndpoints,
    networkTransportEndpoints: config.networkTransportEndpoints,
    bluetoothTransportEndpoints: config.bluetoothTransportEndpoints,
    heartbeatIntervalMs: config.heartbeatIntervalMs,
    reconnectInitialDelayMs: config.reconnectInitialDelayMs,
    reconnectMaxDelayMs: config.reconnectMaxDelayMs,
    bindingStatusProvider: options.bindingStatusProvider,
  });
}
