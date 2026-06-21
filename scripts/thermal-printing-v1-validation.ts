/**
 * THERMAL-PRINTING-V1-VALIDATION — full production printing pipeline (no mocks, no direct spooler-only tests).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { desc } from "drizzle-orm";
import { bootAgent } from "../agent/runtime/boot";
import { shutdownAgent } from "../agent/runtime/shutdown";
import { createIdentity } from "../agent/identity/createIdentity";
import { MemoryIdentityStore } from "../agent/identity/identityStore";
import { createProductionTransportClients } from "../agent/consumption/jobConsumptionService";
import { createAgentTransportRegistry } from "../agent/transports/transportRegistry";
import { orderItems, orders, printers } from "../drizzle/schema";
import { getDb } from "../server/db";
import { attachPrintAgentWebSocketServer } from "../server/printing/printAgentWebSocketServer";
import { registerDbPrinterProfileMapping } from "../server/printing/printerResolutionRegistry";
import { resolvePrintTarget } from "../server/printing/printTargetSelectionService";
import { createPrintJob } from "../server/printing/printJobService";
import { dispatchAssignedPrintJob } from "../server/printing/endToEndPrintFlowService";
import { getStoredJobExecutionOutcome } from "../server/printing/executionOutcomeStore";
import { getDeliveryAckRecord } from "../server/printing/deliveryAckService";
import { getPrintJobAssignment } from "../server/printing/assignmentService";
import { PRINT_JOB_TRIGGER } from "../shared/printing/types";
import type { PrinterProfile } from "../shared/printing/printerProfiles";
import type { UsbTransportEndpoint } from "../shared/printing/transports/transportContracts";

const VALIDATION_PORT = 3099;
const AGENT_ID = "thermal-v1-validation-agent";
const AGENT_NAME = "Thermal V1 Validation Agent";
const PRINTER_NAME = "POS-80C (copy 1)";
const PORT_NAME = "USB001";

const SPOOLER_ENDPOINT: UsbTransportEndpoint = {
  kind: "windows-spooler",
  printerName: PRINTER_NAME,
  portName: PORT_NAME,
};

type DbPrinterRow = {
  id: number;
  restaurantId: number;
  name: string;
  profileId: string;
  paperWidthMm: number;
};

type DbOrderRow = {
  id: number;
  restaurantId: number;
  orderNumber: string | null;
};

type ValidationLog = {
  startup: string[];
  execution: string[];
  errors: string[];
};

const log: ValidationLog = {
  startup: [],
  execution: [],
  errors: [],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStartupProfile(profileId: string, displayName: string): PrinterProfile {
  return {
    printerId: profileId,
    printerName: displayName,
    transport: "usb",
    capabilities: {
      escpos: true,
      cutter: false,
      cashDrawer: false,
      qrCode: true,
      imagePrinting: false,
    },
    executionCapabilities: {
      airprint: false,
      vendorSdk: false,
    },
    paperWidth: 80,
  };
}

async function loadValidationData(): Promise<{ dbPrinter: DbPrinterRow; order: DbOrderRow }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  const [order] = await db
    .select({
      id: orders.id,
      restaurantId: orders.restaurantId,
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .orderBy(desc(orders.id))
    .limit(1);

  if (!order) {
    throw new Error("No orders with items found in database");
  }

  let [dbPrinter] = await db
    .select()
    .from(printers)
    .where(eq(printers.restaurantId, order.restaurantId))
    .orderBy(printers.id)
    .limit(1);

  if (!dbPrinter) {
    const profileId = "pos-80c-copy-1-usb001";
    const insertResult = await db.insert(printers).values({
      restaurantId: order.restaurantId,
      name: "POS-80C (copy 1)",
      paperWidthMm: 80,
      profileId,
      isDefault: true,
    });
    const insertId = Number(insertResult[0].insertId);
    [dbPrinter] = await db.select().from(printers).where(eq(printers.id, insertId)).limit(1);
    log.execution.push(
      `Seeded validation printer id=${insertId} profileId=${profileId} for restaurant ${order.restaurantId}`
    );
  }

  if (!dbPrinter) {
    throw new Error("Failed to resolve printer for validation");
  }

  return {
    dbPrinter: {
      id: dbPrinter.id,
      restaurantId: dbPrinter.restaurantId,
      name: dbPrinter.name,
      profileId: dbPrinter.profileId,
      paperWidthMm: dbPrinter.paperWidthMm,
    },
    order,
  };
}

async function waitForAgentReady(
  runtime: Awaited<ReturnType<typeof bootAgent>>,
  timeoutMs = 15_000
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (runtime.lifecycle.getState() === "ready") {
      return true;
    }
    await sleep(100);
  }
  return false;
}

async function main(): Promise<void> {
  log.startup.push(`Endpoint configuration: ${JSON.stringify(SPOOLER_ENDPOINT)}`);

  const transportClients = createProductionTransportClients();
  const registry = createAgentTransportRegistry(transportClients);
  log.startup.push(
    `Transport registry initialized with adapters: ${registry.listSupported().join(", ")}`
  );
  log.startup.push(
    `Windows spooler client registered: ${transportClients.windowsSpoolerDeviceClient.constructor.name}`
  );

  const { dbPrinter, order } = await loadValidationData();
  log.execution.push(
    `Using DB printer id=${dbPrinter.id} profileId=${dbPrinter.profileId} name=${dbPrinter.name}`
  );
  log.execution.push(
    `Using order id=${order.id} orderNumber=${order.orderNumber ?? "n/a"} restaurantId=${order.restaurantId}`
  );

  const usbTransportEndpoints: Record<string, UsbTransportEndpoint> = {
    [dbPrinter.profileId]: SPOOLER_ENDPOINT,
  };
  log.startup.push(
    `Printer endpoint loaded for profile ${dbPrinter.profileId}: ${JSON.stringify(usbTransportEndpoints[dbPrinter.profileId])}`
  );

  const identityStore = new MemoryIdentityStore();
  await identityStore.save(
    createIdentity({ agentName: AGENT_NAME, agentId: AGENT_ID })
  );

  const httpServer = createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });
  attachPrintAgentWebSocketServer(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(VALIDATION_PORT, resolve);
  });
  log.startup.push(
    `Print agent WebSocket server listening on ws://127.0.0.1:${VALIDATION_PORT}/ws/print-agent`
  );

  const runtime = await bootAgent({
    serverUrl: `ws://127.0.0.1:${VALIDATION_PORT}/ws/print-agent`,
    agentName: AGENT_NAME,
    platform: "windows",
    identityStore,
    transportClients,
    usbTransportEndpoints,
    startupPrinters: [buildStartupProfile(dbPrinter.profileId, dbPrinter.name)],
    heartbeatIntervalMs: 60_000,
    reconnectInitialDelayMs: 500,
    reconnectMaxDelayMs: 2_000,
  });

  const ready = await waitForAgentReady(runtime);
  if (!ready) {
    throw new Error(`Agent did not reach ready state (current: ${runtime.lifecycle.getState()})`);
  }
  log.startup.push(`Agent running: agentId=${AGENT_ID} lifecycle=${runtime.lifecycle.getState()}`);

  await sleep(300);

  const mapping = registerDbPrinterProfileMapping({
    dbPrinterId: dbPrinter.id,
    profilePrinterId: dbPrinter.profileId,
  });
  log.execution.push(
    `Printer profile mapping registered: dbPrinterId=${mapping.dbPrinterId} -> profilePrinterId=${mapping.profilePrinterId}`
  );

  const target = await resolvePrintTarget({
    restaurantId: order.restaurantId,
  });
  log.execution.push(
    `Print target selected: dbPrinterId=${target.dbPrinterId} reason=${target.reason}`
  );

  const reprintId = randomUUID();
  const created = await createPrintJob({
    orderId: order.id,
    trigger: PRINT_JOB_TRIGGER.REPRINT,
    reprintId,
    printerId: target.dbPrinterId,
  });
  log.execution.push(
    `Print job created: jobId=${created.job.id} created=${created.created} printerId=${created.job.printerId ?? target.dbPrinterId} idempotencyKey=${created.job.idempotencyKey}`
  );

  const dispatch = await dispatchAssignedPrintJob({ jobId: created.job.id });
  log.execution.push(
    `Job assignment: agentId=${dispatch.assignment.agentId} notified=${dispatch.notified} assignmentCreated=${dispatch.assignmentCreated}`
  );
  if (!dispatch.notified) {
    log.errors.push(
      `Agent notification skipped: ${dispatch.notificationSkippedReason ?? "unknown"}`
    );
  }

  const assignment = getPrintJobAssignment(created.job.id);
  if (assignment) {
    log.execution.push(`Job assigned to agent for jobId=${assignment.jobId}`);
  }

  let outcome = getStoredJobExecutionOutcome(created.job.id);
  let ack = getDeliveryAckRecord(AGENT_ID, created.job.id);
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline && (!outcome || !ack)) {
    await sleep(250);
    outcome = getStoredJobExecutionOutcome(created.job.id) ?? outcome;
    ack = getDeliveryAckRecord(AGENT_ID, created.job.id) ?? ack;
  }

  if (outcome) {
    log.execution.push(
      `ExecutionResult: status=${outcome.outcomeStatus} category=${outcome.category} transport=${outcome.transport ?? "n/a"} message=${outcome.message ?? ""}`
    );
  } else {
    log.errors.push("No execution outcome report received within timeout");
  }

  if (ack) {
    log.execution.push(`Delivery ack recorded at ${ack.timestamp}`);
  } else {
    log.errors.push("No delivery acknowledgement recorded within timeout");
  }

  await shutdownAgent(runtime);
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));

  console.log("\n=== THERMAL-PRINTING-V1-VALIDATION LOG ===\n");
  console.log("--- Startup ---");
  for (const line of log.startup) {
    console.log(line);
  }
  console.log("\n--- Execution ---");
  for (const line of log.execution) {
    console.log(line);
  }
  if (log.errors.length > 0) {
    console.log("\n--- Errors ---");
    for (const line of log.errors) {
      console.log(line);
    }
  }

  const passed =
    log.errors.length === 0 &&
    dispatch.notified &&
    outcome?.outcomeStatus === "executed" &&
    ack != null;

  console.log("\n=== VERDICT ===");
  console.log(
    passed ? "THERMAL-PRINTING-V1-VALIDATION PASSED" : "THERMAL-PRINTING-V1-VALIDATION FAILED"
  );

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[thermal-v1-validation] fatal:", error);
  process.exit(1);
});
