/**
 * THERMAL-PRINTING — reusable end-to-end printing validation harness.
 *
 * Purpose:
 *   Spins up (or attaches to) a print-agent WebSocket server, launches
 *   `scripts/print-agent.ts` from a deployment config, and validates the full
 *   registration → resolution → routing → assignment → dispatch → delivery →
 *   execution-outcome pipeline without modifying printing architecture.
 *
 * Required configuration (one of):
 *   - Agent deployment JSON via `--config` or `PRINT_VALIDATION_CONFIG_PATH`
 *     (falls back to `PRINT_AGENT_CONFIG_PATH`, then `agent/config/production.example.json`)
 *   - Database target via `--db-printer-id` / `PRINT_VALIDATION_DB_PRINTER_ID`
 *     (optional: resolved automatically from deployment profile IDs)
 *
 * Optional:
 *   - `--restaurant-id` / `PRINT_VALIDATION_RESTAURANT_ID` — assert restaurant scope
 *   - `--port` / `PRINT_VALIDATION_PORT` — local WebSocket port (default 3120)
 *   - `--skip-live-print` / `PRINT_VALIDATION_SKIP_LIVE_PRINT=1` — registration/routing only
 *   - `--external-server` / `PRINT_VALIDATION_EXTERNAL_SERVER=1` — use config serverUrl;
 *     do not start a local WebSocket server or override server URL
 *   - `--no-spawn-agent` / `PRINT_VALIDATION_NO_SPAWN_AGENT=1` — agent already running
 *
 * Expected outputs:
 *   - Structured JSON report on stdout (stages, errors, risks)
 *   - Exit code 0 when all enabled stages pass; 1 otherwise
 *   - Verdict line: `PRINTING-E2E-VALIDATION PASSED` or `FAILED`
 *
 * Usage:
 *   pnpm exec tsx scripts/validate-printing-e2e.ts --config agent/config/production.720007.json
 *   PRINT_VALIDATION_DB_PRINTER_ID=1 pnpm exec tsx scripts/validate-printing-e2e.ts --config path/to/config.json
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import {
  DEPLOYMENT_CONFIG_ENV,
  loadDeploymentConfig,
  resolveDeploymentConfigPath,
} from "../agent/config/loadDeploymentConfig";
import type { AgentDeploymentConfig } from "../agent/config/types";
import {
  DEFAULT_LIVE_PRINT_TIMEOUT_MS,
  DEFAULT_REGISTRATION_TIMEOUT_MS,
  DEFAULT_VALIDATION_PORT,
  parseValidationArgv,
  type ValidationHarnessOptions,
} from "../agent/config/printingE2eValidationOptions";
import { orderItems, orders, printers } from "../drizzle/schema";
import { getDb } from "../server/db";
import { listAgents } from "../server/printing/agentRegistry";
import { listAgentConnectivityStates } from "../server/printing/agentLifecycleService";
import { getAgentPrinterProfiles } from "../server/printing/printerProfileQueries";
import { attachPrintAgentWebSocketServer } from "../server/printing/printAgentWebSocketServer";
import { rebuildPrinterResolutionRegistryFromDb } from "../server/printing/printerResolutionPersistenceService";
import { resolvePrinter } from "../server/printing/printerResolutionService";
import {
  listAgentOverview,
  listPrinterOverview,
} from "../server/printing/printOperationsService";
import { getPrintingReadinessAuthority } from "../server/printing/printingReadinessAuthority";
import { resolveRoutingDecision, clearRoutingState } from "../server/printing/routingEngine";
import { createPrintJob } from "../server/printing/printJobService";
import { dispatchAssignedPrintJob } from "../server/printing/endToEndPrintFlowService";
import { getStoredJobExecutionOutcome } from "../server/printing/executionOutcomeStore";
import { getDeliveryAckRecord } from "../server/printing/deliveryAckService";
import { getPrintJobAssignment } from "../server/printing/assignmentService";
import { PRINT_JOB_TRIGGER } from "../shared/printing/types";
import {
  isUsbWindowsSpoolerEndpoint,
  normalizeUsbTransportEndpoint,
} from "../shared/printing/transports/usbTransportEndpoint";

export type { ValidationHarnessOptions, ValidationStageResult, ValidationReport };
export { parseValidationArgv } from "../agent/config/printingE2eValidationOptions";

const LOG_PREFIX = "[printing-e2e]";

export type ValidationStageResult = {
  stage: string;
  passed: boolean;
  details: Record<string, unknown>;
};

export type ValidationReport = {
  harness: string;
  startedAt: string;
  finishedAt: string;
  options: ValidationHarnessOptions & {
    resolvedConfigPath: string;
    serverUrl: string;
    agentId: string;
    expectedProfileIds: string[];
  };
  agentConfiguration: Record<string, unknown>;
  databaseContext: Record<string, unknown>;
  startupLogs: string[];
  stages: ValidationStageResult[];
  registrationResult: Record<string, unknown>;
  connectedAgentState: Record<string, unknown>;
  reportedProfiles: Record<string, unknown>;
  printerResolutionResult: Record<string, unknown>;
  printerOperationsResult: Record<string, unknown>;
  routingValidation: Record<string, unknown>;
  livePrintValidation: Record<string, unknown>;
  physicalPrinterResult: Record<string, unknown>;
  risksFound: string[];
  errors: string[];
  verdict: "PRINTING-E2E-VALIDATION PASSED" | "PRINTING-E2E-VALIDATION FAILED";
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function buildLocalServerUrl(port: number): string {
  return `ws://127.0.0.1:${port}/ws/print-agent`;
}

function stage(name: string, passed: boolean, details: Record<string, unknown>): ValidationStageResult {
  return { stage: name, passed, details };
}

async function loadDatabaseContext(input: {
  dbPrinterId?: number;
  restaurantId?: number;
  profileIds: string[];
}): Promise<{
  restaurantId: number;
  orderId: number;
  dbPrinterId: number;
  profileId: string;
  printerName: string;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable (DATABASE_URL required)");
  }

  let printerRow:
    | {
        id: number;
        restaurantId: number;
        name: string;
        profileId: string;
      }
    | undefined;

  if (input.dbPrinterId) {
    const [row] = await db
      .select({
        id: printers.id,
        restaurantId: printers.restaurantId,
        name: printers.name,
        profileId: printers.profileId,
      })
      .from(printers)
      .where(eq(printers.id, input.dbPrinterId))
      .limit(1);
    printerRow = row;
    if (!printerRow) {
      throw new Error(`Database printer not found for id=${input.dbPrinterId}`);
    }
  } else if (input.profileIds.length > 0) {
    const [row] = await db
      .select({
        id: printers.id,
        restaurantId: printers.restaurantId,
        name: printers.name,
        profileId: printers.profileId,
      })
      .from(printers)
      .where(inArray(printers.profileId, input.profileIds))
      .orderBy(printers.id)
      .limit(1);
    printerRow = row;
    if (!printerRow) {
      throw new Error(
        `No database printer found matching deployment profileIds: ${input.profileIds.join(", ")}`
      );
    }
  } else {
    throw new Error("Specify --db-printer-id or include startupPrinters in deployment config");
  }

  if (input.restaurantId && printerRow.restaurantId !== input.restaurantId) {
    throw new Error(
      `Printer id=${printerRow.id} belongs to restaurant ${printerRow.restaurantId}, expected ${input.restaurantId}`
    );
  }

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.restaurantId, printerRow.restaurantId))
    .orderBy(desc(orders.id))
    .limit(1);

  if (!order) {
    throw new Error(`No orders with items found for restaurant ${printerRow.restaurantId}`);
  }

  return {
    restaurantId: printerRow.restaurantId,
    orderId: order.id,
    dbPrinterId: printerRow.id,
    profileId: printerRow.profileId.trim(),
    printerName: printerRow.name,
  };
}

async function waitForAgentRegistration(
  agentId: string,
  expectedProfileCount: number,
  timeoutMs: number
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const registered = listAgents().some(
      (agent) => agent.registration.identity.agentId === agentId
    );
    const profiles = getAgentPrinterProfiles(agentId);
    if (registered && profiles && profiles.profiles.length >= expectedProfileCount) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

function spawnPrintAgent(configPath: string, serverUrl: string): ChildProcess {
  const absoluteConfig = resolve(process.cwd(), configPath);
  return spawn(
    "pnpm",
    ["exec", "tsx", "scripts/print-agent.ts", "--config", absoluteConfig],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PRINT_AGENT_SERVER_URL: serverUrl,
        PRINT_AGENT_CONFIG_PATH: absoluteConfig,
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}

async function stopChildProcess(child: ChildProcess | null): Promise<void> {
  if (!child || child.killed) {
    return;
  }

  child.kill("SIGTERM");
  await sleep(1_000);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

async function closeHttpServer(server: Server): Promise<void> {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }

  await Promise.race([
    new Promise<void>((resolveClose, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolveClose();
      });
    }),
    sleep(3_000).then(() => {
      throw new Error("HTTP server close timed out");
    }),
  ]).catch(() => undefined);
}

function physicalPrinterHints(
  config: AgentDeploymentConfig,
  profileId: string
): Record<string, unknown> {
  const endpoint = config.usbTransportEndpoints[profileId];
  if (!endpoint) {
    return { note: "No USB endpoint configured for resolved profile" };
  }

  const normalized = normalizeUsbTransportEndpoint(endpoint);
  if (isUsbWindowsSpoolerEndpoint(normalized)) {
    return {
      endpointKind: normalized.kind,
      printerName: normalized.printerName,
      portName: normalized.portName ?? null,
      note: "Verify physical ticket output on the configured Windows spooler queue",
    };
  }

  return {
    endpointKind: normalized.kind,
    devicePath: "devicePath" in normalized ? normalized.devicePath : null,
    note: "Verify physical output on the configured USB device path",
  };
}

export async function runPrintingE2EValidation(
  harnessOptions: ValidationHarnessOptions = {}
): Promise<ValidationReport> {
  const startedAt = new Date().toISOString();
  const options = { ...harnessOptions };
  const stages: ValidationStageResult[] = [];
  const startupLogs: string[] = [];
  const errors: string[] = [];
  const risksFound: string[] = [];

  const log = (line: string) => {
    startupLogs.push(line);
    console.log(`${LOG_PREFIX} ${line}`);
  };

  const resolvedConfigPath = resolveDeploymentConfigPath({ configPath: options.configPath });
  const useLocalServer = !options.externalServer;
  const serverUrl = useLocalServer
    ? buildLocalServerUrl(options.port ?? DEFAULT_VALIDATION_PORT)
    : process.env[DEPLOYMENT_CONFIG_ENV.SERVER_URL]?.trim() || "";

  const config = await loadDeploymentConfig({
    configPath: resolvedConfigPath,
    env: useLocalServer
      ? { ...process.env, [DEPLOYMENT_CONFIG_ENV.SERVER_URL]: serverUrl }
      : process.env,
  });

  if (!useLocalServer && !config.serverUrl.trim()) {
    throw new Error("external-server mode requires serverUrl in deployment config or PRINT_AGENT_SERVER_URL");
  }

  const effectiveServerUrl = useLocalServer ? serverUrl : config.serverUrl;
  const expectedProfileIds = config.startupPrinters.map((profile) => profile.printerId);
  const expectedProfileCount = expectedProfileIds.length;
  const expectedTransport = config.startupPrinters[0]?.transport ?? "usb";

  log(`Loaded deployment config: agentId=${config.agentId} profiles=${expectedProfileCount}`);

  const dbContext = await loadDatabaseContext({
    dbPrinterId: options.dbPrinterId,
    restaurantId: options.restaurantId,
    profileIds: expectedProfileIds,
  });

  log(
    `Database context: dbPrinterId=${dbContext.dbPrinterId} profileId=${dbContext.profileId} restaurantId=${dbContext.restaurantId}`
  );

  if (!expectedProfileIds.includes(dbContext.profileId)) {
    errors.push(
      `Database profileId ${dbContext.profileId} is not listed in deployment startupPrinters`
    );
  }

  const rebuild = await rebuildPrinterResolutionRegistryFromDb();
  log(`Resolution registry rebuilt: ${rebuild.rebuilt} mapping(s)`);

  let httpServer: Server | null = null;
  let agentProcess: ChildProcess | null = null;

  if (useLocalServer) {
    httpServer = createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    attachPrintAgentWebSocketServer(httpServer);
    await new Promise<void>((resolveListen, reject) => {
      httpServer!.once("error", reject);
      httpServer!.listen(options.port ?? DEFAULT_VALIDATION_PORT, resolveListen);
    });
    log(`WebSocket server listening on ${effectiveServerUrl}`);
  } else {
    log(`Using external WebSocket server: ${effectiveServerUrl}`);
  }

  if (!options.noSpawnAgent) {
    agentProcess = spawnPrintAgent(resolvedConfigPath, effectiveServerUrl);
    agentProcess.stdout?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        log(`[print-agent] ${line}`);
      }
    });
    agentProcess.stderr?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
        log(`[print-agent:stderr] ${line}`);
      }
    });
    log("Spawned scripts/print-agent.ts");
  } else {
    log("Skipping agent spawn (expecting existing connected agent)");
  }

  const registered = await waitForAgentRegistration(
    config.agentId,
    expectedProfileCount,
    options.registrationTimeoutMs ?? DEFAULT_REGISTRATION_TIMEOUT_MS
  );

  stages.push(
    stage("agent-registration", registered, {
      agentId: config.agentId,
      expectedProfileCount,
    })
  );
  if (!registered) {
    errors.push("Agent did not register and report profiles within timeout");
  } else {
    log("Agent registered with reported profiles");
  }

  const agents = listAgents();
  const connectivity = listAgentConnectivityStates();
  const inventory = getAgentPrinterProfiles(config.agentId);
  const reportedProfileList =
    inventory?.profiles.map((profile) => ({
      printerId: profile.printerId,
      printerName: profile.printerName,
      transport: profile.transport,
    })) ?? [];

  const capabilityReported = connectivity.some(
    (state) => state.agentId === config.agentId && state.status === "online"
  );
  stages.push(
    stage("profile-reporting", (inventory?.profiles.length ?? 0) >= expectedProfileCount, {
      reportedProfileCount: inventory?.profiles.length ?? 0,
      profiles: reportedProfileList,
    })
  );
  stages.push(
    stage("capability-reporting", capabilityReported, {
      agentId: config.agentId,
      connectivity: connectivity.find((state) => state.agentId === config.agentId) ?? null,
    })
  );

  const registrationResult = {
    registered,
    agentCount: agents.length,
    agentIds: agents.map((agent) => agent.registration.identity.agentId),
  };

  const connectedAgentState = {
    agents: connectivity.map((state) => ({
      agentId: state.agentId,
      status: state.status,
      lastHeartbeatAt: state.lastHeartbeatAt ?? null,
    })),
    connectedAt:
      agents.find((agent) => agent.registration.identity.agentId === config.agentId)
        ?.registration.connectedAt ?? null,
  };

  const reportedProfiles = {
    agentId: config.agentId,
    profileCount: inventory?.profiles.length ?? 0,
    profiles: reportedProfileList,
  };

  let resolution: Record<string, unknown>;
  let resolutionPassed = false;
  try {
    const resolved = resolvePrinter(dbContext.dbPrinterId);
    resolutionPassed =
      resolved.agentId === config.agentId &&
      resolved.profilePrinterId === dbContext.profileId;
    resolution = {
      status: resolutionPassed ? "resolved" : "mismatch",
      dbPrinterId: resolved.dbPrinterId,
      profilePrinterId: resolved.profilePrinterId,
      agentId: resolved.agentId,
      expectedAgentId: config.agentId,
      expectedProfilePrinterId: dbContext.profileId,
    };
    if (!resolutionPassed) {
      errors.push("Printer resolution agent/profile mismatch");
    }
  } catch (error) {
    resolution = {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
    errors.push(`resolvePrinter(${dbContext.dbPrinterId}) failed`);
  }
  stages.push(stage("printer-resolution", resolutionPassed, resolution));

  const printerOverview = await listPrinterOverview(dbContext.restaurantId);
  const agentOverview = await listAgentOverview(dbContext.restaurantId);
  const readiness = await getPrintingReadinessAuthority(dbContext.restaurantId);
  const targetPrinterReadiness = readiness.printers.find(
    (printer) => printer.printerId === dbContext.dbPrinterId
  );

  const readinessPassed =
    (readiness.setupState === "READY" || readiness.setupState === "READY_FOR_TEST") &&
    targetPrinterReadiness?.bindingStatus === "BOUND" &&
    agentOverview.some(
      (agent) =>
        agent.agentId === config.agentId &&
        agent.reportedProfileCount >= expectedProfileCount &&
        agent.platform === config.platform
    );

  const printerOperationsResult = {
    authority: {
      setupState: readiness.setupState,
      operationalState: readiness.operationalState,
      nextAction: readiness.nextAction,
      targetPrinter: targetPrinterReadiness ?? null,
    },
    legacyActivePrinters: printerOverview.filter((printer) => printer.isActive).length,
    printers: printerOverview,
    agents: agentOverview,
  };
  stages.push(stage("printing-readiness-authority", readinessPassed, printerOperationsResult));
  if (!readinessPassed) {
    risksFound.push(
      "Printing readiness authority did not report READY/READY_FOR_TEST with bound target printer"
    );
  }

  clearRoutingState();
  const routingJobId = Number(`${Date.now()}`.slice(-9));
  let routing: Record<string, unknown>;
  let routingPassed = false;
  try {
    const decision = resolveRoutingDecision({
      jobId: routingJobId,
      printerId: dbContext.dbPrinterId,
      restaurantId: dbContext.restaurantId,
    });
    routingPassed = decision.agentId === config.agentId;
    routing = {
      status: routingPassed ? "routed" : "mismatch",
      jobId: decision.jobId,
      agentId: decision.agentId,
      expectedAgentId: config.agentId,
      printerId: decision.printerId,
      reason: decision.reason,
    };
    if (!routingPassed) {
      errors.push("resolveRoutingDecision returned unexpected agentId");
    }
  } catch (error) {
    routing = {
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
    errors.push("resolveRoutingDecision failed");
  }
  stages.push(stage("routing", routingPassed, routing));

  let livePrint: Record<string, unknown> = { skipped: true, reason: "disabled" };
  let physicalPrinterResult: Record<string, unknown> = {};
  let assignmentPassed = false;
  let dispatchPassed = false;
  let deliveryAckPassed = false;
  let executionOutcomePassed = false;

  if (!options.skipLivePrint) {
    if (registered && routingPassed) {
      const created = await createPrintJob({
        orderId: dbContext.orderId,
        trigger: PRINT_JOB_TRIGGER.REPRINT,
        reprintId: randomUUID(),
        printerId: dbContext.dbPrinterId,
      });

      const dispatch = await dispatchAssignedPrintJob({ jobId: created.job.id });
      const assignment = getPrintJobAssignment(created.job.id);

      assignmentPassed = assignment?.agentId === config.agentId;
      dispatchPassed = dispatch.notified === true;
      stages.push(
        stage("assignment", assignmentPassed, {
          jobId: created.job.id,
          assignment: assignment
            ? { agentId: assignment.agentId, assignedAt: assignment.assignedAt }
            : null,
        })
      );
      stages.push(
        stage("dispatch", dispatchPassed, {
          jobId: created.job.id,
          notified: dispatch.notified,
          notificationSkippedReason: dispatch.notificationSkippedReason ?? null,
        })
      );

      if (!assignmentPassed) {
        errors.push("Print job assignment missing or agent mismatch");
      }
      if (!dispatchPassed) {
        errors.push(
          `Agent dispatch notification failed: ${dispatch.notificationSkippedReason ?? "unknown"}`
        );
      }

      let outcome = getStoredJobExecutionOutcome(created.job.id);
      let ack = getDeliveryAckRecord(config.agentId, created.job.id);
      const deadline = Date.now() + (options.livePrintTimeoutMs ?? DEFAULT_LIVE_PRINT_TIMEOUT_MS);

      while (Date.now() < deadline && (!outcome || !ack)) {
        await sleep(250);
        outcome = getStoredJobExecutionOutcome(created.job.id) ?? outcome;
        ack = getDeliveryAckRecord(config.agentId, created.job.id) ?? ack;
      }

      deliveryAckPassed = ack != null;
      executionOutcomePassed =
        outcome?.outcomeStatus === "executed" && outcome.transport === expectedTransport;

      stages.push(
        stage("delivery-acknowledgement", deliveryAckPassed, {
          jobId: created.job.id,
          deliveryAck: ack ? { timestamp: ack.timestamp } : null,
        })
      );
      stages.push(
        stage("execution-outcome", executionOutcomePassed, {
          jobId: created.job.id,
          executionOutcome: outcome
            ? {
                outcomeStatus: outcome.outcomeStatus,
                category: outcome.category,
                transport: outcome.transport ?? null,
                message: outcome.message ?? null,
              }
            : null,
        })
      );

      livePrint = {
        jobId: created.job.id,
        assignment: assignment
          ? { agentId: assignment.agentId, assignedAt: assignment.assignedAt }
          : null,
        dispatch: {
          notified: dispatch.notified,
          notificationSkippedReason: dispatch.notificationSkippedReason ?? null,
        },
        executionOutcome: outcome
          ? {
              outcomeStatus: outcome.outcomeStatus,
              category: outcome.category,
              transport: outcome.transport ?? null,
              message: outcome.message ?? null,
            }
          : null,
        deliveryAck: ack ? { timestamp: ack.timestamp } : null,
      };

      physicalPrinterResult = {
        ...physicalPrinterHints(config, dbContext.profileId),
        dbPrinterName: dbContext.printerName,
        executionSuccess: outcome?.outcomeStatus === "executed",
        transportMatches: outcome?.transport === expectedTransport,
      };

      if (!executionOutcomePassed) {
        errors.push("Live print did not reach executed outcome with expected transport");
      }
      if (!deliveryAckPassed) {
        errors.push("No delivery acknowledgement recorded");
      }
    } else {
      livePrint = {
        skipped: true,
        reason: "registration or routing prerequisite failed",
      };
      errors.push("Skipped live print because registration or routing failed");
    }
  } else {
    stages.push(stage("assignment", true, { skipped: true }));
    stages.push(stage("dispatch", true, { skipped: true }));
    stages.push(stage("delivery-acknowledgement", true, { skipped: true }));
    stages.push(stage("execution-outcome", true, { skipped: true }));
    livePrint = { skipped: true, reason: "skip-live-print enabled" };
  }

  await stopChildProcess(agentProcess);
  if (httpServer) {
    await closeHttpServer(httpServer);
  }

  if (useLocalServer) {
    risksFound.push(
      "Local WebSocket host used; production dashboard requires agent pointed at long-running Node host (not Vercel serverless)"
    );
  }

  const enabledLivePrint = !options.skipLivePrint;
  const passed =
    errors.length === 0 &&
    registered &&
    resolutionPassed &&
    routingPassed &&
    opsPassed &&
    (!enabledLivePrint ||
      (assignmentPassed && dispatchPassed && deliveryAckPassed && executionOutcomePassed));

  const finishedAt = new Date().toISOString();

  return {
    harness: "validate-printing-e2e",
    startedAt,
    finishedAt,
    options: {
      ...options,
      resolvedConfigPath,
      serverUrl: effectiveServerUrl,
      agentId: config.agentId,
      expectedProfileIds,
    },
    agentConfiguration: {
      configPath: resolvedConfigPath,
      agentId: config.agentId,
      agentName: config.agentName,
      serverUrl: effectiveServerUrl,
      platform: config.platform,
      startupPrinters: config.startupPrinters.map((profile) => ({
        printerId: profile.printerId,
        printerName: profile.printerName,
        transport: profile.transport,
      })),
      usbTransportEndpoints: config.usbTransportEndpoints,
    },
    databaseContext: dbContext,
    startupLogs,
    stages,
    registrationResult,
    connectedAgentState,
    reportedProfiles,
    printerResolutionResult: resolution,
    printerOperationsResult,
    routingValidation: routing,
    livePrintValidation: livePrint,
    physicalPrinterResult,
    risksFound,
    errors,
    verdict: passed ? "PRINTING-E2E-VALIDATION PASSED" : "PRINTING-E2E-VALIDATION FAILED",
  };
}

async function main(): Promise<void> {
  console.log("=== PRINTING E2E VALIDATION ===\n");

  const harnessOptions = parseValidationArgv(process.argv.slice(2));
  const report = await runPrintingE2EValidation(harnessOptions);

  console.log("\n=== PRINTING E2E VALIDATION REPORT ===\n");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n=== VERDICT ===\n${report.verdict}`);

  if (report.verdict.endsWith("FAILED")) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`${LOG_PREFIX} fatal:`, error);
  process.exit(1);
});
