/**
 * THERMAL-PRINTING-12B — load deployment config from JSON file with env overrides.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentDeploymentConfig, AgentDeploymentConfigFile } from "./types";
import { validateDeploymentConfigFile } from "./validateDeploymentConfig";

export const DEFAULT_DEPLOYMENT_CONFIG_PATH = "agent/config/production.example.json";

export const DEPLOYMENT_CONFIG_ENV = {
  CONFIG_PATH: "PRINT_AGENT_CONFIG_PATH",
  SERVER_URL: "PRINT_AGENT_SERVER_URL",
  AGENT_ID: "PRINT_AGENT_ID",
  AGENT_NAME: "PRINT_AGENT_AGENT_NAME",
} as const;

export type LoadDeploymentConfigOptions = {
  configPath?: string;
  env?: NodeJS.ProcessEnv;
};

function applyEnvOverrides(
  file: AgentDeploymentConfigFile,
  env: NodeJS.ProcessEnv
): AgentDeploymentConfigFile {
  const overridden: AgentDeploymentConfigFile = { ...file };

  const serverUrl = env[DEPLOYMENT_CONFIG_ENV.SERVER_URL]?.trim();
  if (serverUrl) {
    overridden.serverUrl = serverUrl;
  }

  const agentId = env[DEPLOYMENT_CONFIG_ENV.AGENT_ID]?.trim();
  if (agentId) {
    overridden.agentId = agentId;
  }

  const agentName = env[DEPLOYMENT_CONFIG_ENV.AGENT_NAME]?.trim();
  if (agentName) {
    overridden.agentName = agentName;
  }

  return overridden;
}

export function resolveDeploymentConfigPath(
  options: LoadDeploymentConfigOptions = {}
): string {
  const env = options.env ?? process.env;
  const configured =
    options.configPath?.trim() ||
    env[DEPLOYMENT_CONFIG_ENV.CONFIG_PATH]?.trim() ||
    DEFAULT_DEPLOYMENT_CONFIG_PATH;

  return resolve(process.cwd(), configured);
}

export async function loadDeploymentConfig(
  options: LoadDeploymentConfigOptions = {}
): Promise<AgentDeploymentConfig> {
  const env = options.env ?? process.env;
  const configPath = resolveDeploymentConfigPath(options);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const withOverrides = applyEnvOverrides(parsed as AgentDeploymentConfigFile, env);
  return validateDeploymentConfigFile(withOverrides);
}
