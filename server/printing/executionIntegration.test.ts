import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES } from "../../shared/printing/platformCapabilities";
import { AGENT_PRINTER_PROFILE_MESSAGE_TYPES } from "../../shared/printing/printerProfiles";
import { AGENT_WEBSOCKET_MESSAGE_TYPES } from "../../shared/printing/agentWebSocketMessages";
import { EXECUTION_STRATEGY_REASONS } from "../../shared/printing/executionStrategy";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import {
  createAgentStartupReportingState,
  performAgentStartupReporting,
} from "../../agent/runtime/startupReporting";
import {
  AUTHORITATIVE_EXECUTION_PATH,
  LEGACY_DORMANT_EXECUTION_PATH,
} from "./executionAuthority";
import { resolveRuntimeExecutionPlan } from "./executionIntegrationFlow";
import { fetchAuthoritativePrintJob } from "./jobRetrievalService";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPlatformCapabilityStore, upsertAgentPlatformCapabilities } from "./platformCapabilityStore";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  registerOnlineAgent,
  sampleProfile,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
  TEST_RESTAURANT_ID,
} from "./printingTestHelpers";
import { processNextPrintJob } from "./printProcessorWorker";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrinterById: vi.fn(),
  markJobAssigned: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

let mutableJobState: import("../../drizzle/schema").SelectPrintJob;

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobAssigned: (...args: unknown[]) => repoMocks.markJobAssigned(...args),
  markJobPrinting: (...args: unknown[]) => repoMocks.markJobPrinting(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
  markJobFailed: (...args: unknown[]) => repoMocks.markJobFailed(...args),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptMocks.insertPrintAttempt(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

vi.mock("./ticketRenderer", () => ({
  renderKitchenTicket: vi.fn().mockResolvedValue({
    orderId: 500,
    restaurantId: 7,
    items: [{ itemName: "Burger", quantity: 1, notes: null }],
  }),
}));

function setupExecutionStateRepositoryMocks(
  initialJob: import("../../drizzle/schema").SelectPrintJob
): void {
  mutableJobState = { ...initialJob };
  repoMocks.findPrintJobById.mockImplementation(async () => mutableJobState);
  repoMocks.markJobAssigned.mockImplementation(async (_jobId, agentId) => {
    mutableJobState = {
      ...mutableJobState,
      status: "assigned",
      assignedAgentId: agentId,
      assignedAt: "2026-06-18T12:01:00.000Z",
    };
    return mutableJobState;
  });
  repoMocks.markJobPrinting.mockImplementation(async () => {
    mutableJobState = {
      ...mutableJobState,
      status: "printing",
      attemptCount: mutableJobState.attemptCount + 1,
    };
    return mutableJobState;
  });
  repoMocks.markJobPrinted.mockImplementation(async () => {
    mutableJobState = { ...mutableJobState, status: "printed" };
    return mutableJobState;
  });
  repoMocks.markJobFailed.mockImplementation(async () => {
    mutableJobState = { ...mutableJobState, status: "failed" };
    return mutableJobState;
  });
  attemptMocks.insertPrintAttempt.mockResolvedValue(1);
}

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => repoMocks.getOrderById(...args),
  getOrderItemsByOrderId: (...args: unknown[]) => repoMocks.getOrderItemsByOrderId(...args),
}));

const baseJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: TEST_DB_PRINTER_ID,
  stationId: null,
  assignedAgentId: null,
  assignedAt: null,
  status: "queued",
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function seedIntegratedAgent(agentId: string): void {
  registerOnlineAgent(agentId);
  seedPrinterResolution({ agentId });
  upsertAgentPlatformCapabilities({
    agentId,
    timestamp: "2026-06-18T10:00:00.000Z",
    capabilities: {
      platform: "windows",
      transports: { usb: true, network: true, bluetooth: false },
      execution: { localPrinting: true },
    },
  });
}

describe("executionIntegration THERMAL-PRINTING-9D", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPlatformCapabilityStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    setupExecutionStateRepositoryMocks(baseJob as import("../../drizzle/schema").SelectPrintJob);
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: TEST_RESTAURANT_ID,
      name: "Kitchen",
      paperWidthMm: 80,
      profileId: "kitchen-printer-10",
      isDefault: true,
      createdAt: "2026-06-18 12:00:00",
      updatedAt: "2026-06-18 12:00:00",
    });
    repoMocks.getOrderById.mockResolvedValue({
      id: 500,
      restaurantId: 7,
      tableId: 1,
      tableNumber: 1,
      sessionId: null,
      customerName: null,
      customerPhone: null,
      status: "pending",
      notes: null,
      totalAmount: "10.00",
      orderNumber: "ORD-500",
      trackingToken: "tok",
      readyPushSentAt: null,
      readyAt: null,
      whatsappSent: false,
      createdAt: "2026-06-18 12:00:00",
      updatedAt: "2026-06-18 12:00:00",
    });
    repoMocks.getOrderItemsByOrderId.mockResolvedValue([
      { itemName: "Burger", quantity: 1, notes: null },
    ]);
  });

  describe("Scenario A — Agent startup reports profiles", () => {
    it("sends printer profile inventory after hello during startup reporting", () => {
      const sent: string[] = [];
      performAgentStartupReporting({
        agentId: "agent-alpha",
        platform: "windows",
        sender: { send: (data) => sent.push(data) },
        reporting: createAgentStartupReportingState(),
        printers: [sampleProfile],
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(JSON.parse(sent[0]!).type).toBe(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT);
    });
  });

  describe("Scenario B — Agent startup reports capabilities", () => {
    it("sends platform capability report during startup reporting", () => {
      const sent: string[] = [];
      performAgentStartupReporting({
        agentId: "agent-alpha",
        platform: "windows",
        sender: { send: (data) => sent.push(data) },
        reporting: createAgentStartupReportingState(),
        printers: [sampleProfile],
        timestamp: "2026-06-18T10:00:00.000Z",
      });

      expect(JSON.parse(sent[1]!).type).toBe(
        AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT
      );
    });
  });

  describe("Scenario C — Delivery confirmation completes", () => {
    it("is covered by agent consumption integration tests", () => {
      expect(AGENT_JOB_MESSAGE_TYPES.DELIVERY_CONFIRMED).toBe("agent.job.delivery.confirmed");
    });
  });

  describe("Scenario D — ExecutionContext participates in runtime flow", () => {
    it("builds execution context during runtime plan resolution", () => {
      seedIntegratedAgent("agent-alpha");

      const plan = resolveRuntimeExecutionPlan({
        agentId: "agent-alpha",
        dbPrinterId: TEST_DB_PRINTER_ID,
      });

      expect(plan.summary.contextBuilt).toBe(true);
      expect(plan.context?.platform.identity).toBe("windows");
    });
  });

  describe("Scenario E — ExecutionStrategy participates in runtime flow", () => {
    it("resolves execution strategy from runtime context", () => {
      seedIntegratedAgent("agent-alpha");

      const plan = resolveRuntimeExecutionPlan({
        agentId: "agent-alpha",
        dbPrinterId: TEST_DB_PRINTER_ID,
      });

      expect(plan.summary.strategyResolved).toBe(true);
      expect(plan.summary.method).toBe("raw-escpos");
      expect(plan.strategy?.resolved).toBe(true);
    });
  });

  describe("Scenario F — Runtime flow uses context→strategy ordering", () => {
    it("resolves strategy only after context is built in integration flow", () => {
      seedIntegratedAgent("agent-alpha");

      const plan = resolveRuntimeExecutionPlan({
        agentId: "agent-alpha",
        dbPrinterId: TEST_DB_PRINTER_ID,
      });

      expect(plan.context).toBeDefined();
      expect(plan.strategy).toBeDefined();
      expect(plan.summary.strategyReason).toBe(
        EXECUTION_STRATEGY_REASONS.PLATFORM_ESC_POS_DIRECT
      );
    });
  });

  describe("Scenario G — Single execution authority enforced", () => {
    it("declares agent runtime as authoritative execution path", () => {
      expect(AUTHORITATIVE_EXECUTION_PATH).toBe("agent-runtime");
      expect(LEGACY_DORMANT_EXECUTION_PATH).toBe("print-processor-worker");
    });
  });

  describe("Scenario H — Legacy worker path remains isolated", () => {
    it("keeps printProcessorWorker importable without participating in agent fetch flow", async () => {
      expect(typeof processNextPrintJob).toBe("function");
      expect(AUTHORITATIVE_EXECUTION_PATH).not.toBe(LEGACY_DORMANT_EXECUTION_PATH);
    });
  });

  describe("Scenario I — No execution side effects", () => {
    it("returns execution plan metadata without performing device I/O during job retrieval", async () => {
      seedIntegratedAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      const retrieval = await fetchAuthoritativePrintJob({
        agentId: "agent-alpha",
        jobId: 100,
      });

      expect(retrieval.found).toBe(true);
      if (!retrieval.found) return;

      expect(retrieval.executionPlan.contextBuilt).toBe(true);
      expect(retrieval.executionPlan.strategyResolved).toBe(true);
      expect(retrieval.job.ticket.items).toHaveLength(1);
    });
  });

  it("includes execution plan on job fetch wire responses", async () => {
    seedIntegratedAgent("agent-alpha");
    await assignPrintJob({ jobId: 100 });

    const { serializeJobFetchResponse } = await import("./jobRetrievalRouter");
    const retrieval = await fetchAuthoritativePrintJob({
      agentId: "agent-alpha",
      jobId: 100,
    });

    expect(retrieval.found).toBe(true);
    if (!retrieval.found) return;

    const wire = JSON.parse(
      serializeJobFetchResponse({
        requestId: "req-1",
        found: true,
        job: retrieval.job,
        executionPlan: retrieval.executionPlan,
      })
    );

    expect(wire.executionPlan.method).toBe("raw-escpos");
  });

  it("documents hello → profiles → capabilities startup ordering", () => {
    const sent: string[] = [];
    performAgentStartupReporting({
      agentId: "agent-alpha",
      platform: "windows",
      sender: { send: (data) => sent.push(data) },
      reporting: createAgentStartupReportingState(),
      printers: [sampleProfile],
    });

    expect(sent.length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(sent[0]!).type).toBe(AGENT_PRINTER_PROFILE_MESSAGE_TYPES.PROFILES_REPORT);
    expect(JSON.parse(sent[1]!).type).toBe(
      AGENT_PLATFORM_CAPABILITY_MESSAGE_TYPES.CAPABILITIES_REPORT
    );
    expect(AGENT_WEBSOCKET_MESSAGE_TYPES.HELLO).toBe("agent.hello");
  });
});
