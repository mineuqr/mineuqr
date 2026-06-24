export const AGENT_CONFIG_DOWNLOAD_FILENAME = "mineuqr-agent-config.json";

const AGENT_CONFIG_MIME_TYPE = "application/json;charset=utf-8";

/** Pretty-print agent connect config for download (matches dashboard preview). */
export function serializeAgentConfigForDownload(config: Record<string, unknown>): string {
  return JSON.stringify(config, null, 2);
}

/** Trigger browser download of mineuqr-agent-config.json from provisioning payload. */
export function downloadAgentConfigFile(config: Record<string, unknown>): void {
  const content = serializeAgentConfigForDownload(config);
  const blob = new Blob([content], { type: AGENT_CONFIG_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = AGENT_CONFIG_DOWNLOAD_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
}
