/**
 * THERMAL-PRINTING — printing E2E validation harness options (CLI + env).
 */
import {
  DEFAULT_DEPLOYMENT_CONFIG_PATH,
  DEPLOYMENT_CONFIG_ENV,
} from "./loadDeploymentConfig";

export const VALIDATION_ENV = {
  CONFIG_PATH: "PRINT_VALIDATION_CONFIG_PATH",
  DB_PRINTER_ID: "PRINT_VALIDATION_DB_PRINTER_ID",
  RESTAURANT_ID: "PRINT_VALIDATION_RESTAURANT_ID",
  PORT: "PRINT_VALIDATION_PORT",
  SKIP_LIVE_PRINT: "PRINT_VALIDATION_SKIP_LIVE_PRINT",
  EXTERNAL_SERVER: "PRINT_VALIDATION_EXTERNAL_SERVER",
  NO_SPAWN_AGENT: "PRINT_VALIDATION_NO_SPAWN_AGENT",
  REGISTRATION_TIMEOUT_MS: "PRINT_VALIDATION_REGISTRATION_TIMEOUT_MS",
  LIVE_PRINT_TIMEOUT_MS: "PRINT_VALIDATION_LIVE_PRINT_TIMEOUT_MS",
} as const;

export const DEFAULT_VALIDATION_PORT = 3120;
export const DEFAULT_REGISTRATION_TIMEOUT_MS = 45_000;
export const DEFAULT_LIVE_PRINT_TIMEOUT_MS = 90_000;

export type ValidationHarnessOptions = {
  configPath?: string;
  dbPrinterId?: number;
  restaurantId?: number;
  port?: number;
  skipLivePrint?: boolean;
  externalServer?: boolean;
  noSpawnAgent?: boolean;
  registrationTimeoutMs?: number;
  livePrintTimeoutMs?: number;
};

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function parseValidationArgv(argv: string[]): ValidationHarnessOptions {
  const options: ValidationHarnessOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config" && argv[index + 1]) {
      options.configPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--config=")) {
      options.configPath = arg.slice("--config=".length);
      continue;
    }
    if (arg === "--db-printer-id" && argv[index + 1]) {
      options.dbPrinterId = parsePositiveInt(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--db-printer-id=")) {
      options.dbPrinterId = parsePositiveInt(arg.slice("--db-printer-id=".length));
      continue;
    }
    if (arg === "--restaurant-id" && argv[index + 1]) {
      options.restaurantId = parsePositiveInt(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--restaurant-id=")) {
      options.restaurantId = parsePositiveInt(arg.slice("--restaurant-id=".length));
      continue;
    }
    if (arg === "--port" && argv[index + 1]) {
      options.port = parsePositiveInt(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--port=")) {
      options.port = parsePositiveInt(arg.slice("--port=".length));
      continue;
    }
    if (arg === "--skip-live-print") {
      options.skipLivePrint = true;
      continue;
    }
    if (arg === "--external-server") {
      options.externalServer = true;
      continue;
    }
    if (arg === "--no-spawn-agent") {
      options.noSpawnAgent = true;
      continue;
    }
    if (arg === "--registration-timeout-ms" && argv[index + 1]) {
      options.registrationTimeoutMs = parsePositiveInt(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--live-print-timeout-ms" && argv[index + 1]) {
      options.livePrintTimeoutMs = parsePositiveInt(argv[index + 1]);
      index += 1;
      continue;
    }
  }

  const env = process.env;
  options.configPath =
    options.configPath ||
    env[VALIDATION_ENV.CONFIG_PATH]?.trim() ||
    env[DEPLOYMENT_CONFIG_ENV.CONFIG_PATH]?.trim() ||
    DEFAULT_DEPLOYMENT_CONFIG_PATH;
  options.dbPrinterId =
    options.dbPrinterId ?? parsePositiveInt(env[VALIDATION_ENV.DB_PRINTER_ID]);
  options.restaurantId =
    options.restaurantId ?? parsePositiveInt(env[VALIDATION_ENV.RESTAURANT_ID]);
  options.port =
    options.port ?? parsePositiveInt(env[VALIDATION_ENV.PORT]) ?? DEFAULT_VALIDATION_PORT;
  options.skipLivePrint =
    options.skipLivePrint ?? parseFlag(env[VALIDATION_ENV.SKIP_LIVE_PRINT]);
  options.externalServer =
    options.externalServer ?? parseFlag(env[VALIDATION_ENV.EXTERNAL_SERVER]);
  options.noSpawnAgent =
    options.noSpawnAgent ?? parseFlag(env[VALIDATION_ENV.NO_SPAWN_AGENT]);
  options.registrationTimeoutMs =
    options.registrationTimeoutMs ??
    parsePositiveInt(env[VALIDATION_ENV.REGISTRATION_TIMEOUT_MS]) ??
    DEFAULT_REGISTRATION_TIMEOUT_MS;
  options.livePrintTimeoutMs =
    options.livePrintTimeoutMs ??
    parsePositiveInt(env[VALIDATION_ENV.LIVE_PRINT_TIMEOUT_MS]) ??
    DEFAULT_LIVE_PRINT_TIMEOUT_MS;

  return options;
}
