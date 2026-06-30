import { homedir } from "node:os";
import { join } from "node:path";

export function resolveConnectorConfigDir(): string {
  if (process.platform === "win32" && process.env.ProgramData) {
    return join(process.env.ProgramData, "MineuQR", "connector");
  }
  return join(homedir(), ".mineuqr", "connector");
}

export function resolveConnectorConfigPath(): string {
  return join(resolveConnectorConfigDir(), "config.json");
}

export function resolveConnectorLogPath(): string {
  return join(resolveConnectorConfigDir(), "connector.log");
}
