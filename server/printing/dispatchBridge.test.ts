import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import {
  AgentWebSocketReadyState,
  clearAgentConnections,
  registerConnection,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";
import {
  clearPrintJobAssignments,
  getPrintJobAssignment,
} from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import { executePrintHostDispatch } from "./dispatchBridgeService";
import {
  initializeDispatchReliability,
  replayPendingDispatchNotificationsForAgent,
  replayAllPendingDispatchNotifications,
  resetDispatchReliabilityForTests,
  runDispatchRetrySweep,
} from "./dispatchReliabilityService";
import {
  registerOnlineAgent as registerOnlineAgentWithResolution,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";

type DispatchNotifyRecord = {
  jobId: number;
  agentId: string;
  assignedAt: string;
  restaurantId: number;
  printerId: number;
  orderId: number;
  notified: boolean;
};

const dispatchNotifyMocks = vi.hoisted(() => ({
  records: new Map<number, DispatchNotifyRecord>(),
}));

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrinterById: vi.fn(),
  markJobAssigned: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

vi.mock("./dispatchNotificationRepository", () => ({
  hasPersistedDispatchNotification: async (jobId: number) =>
    dispatchNotifyMocks.records.get(jobId)?.notified ?? false,
  recordPersistedDispatchNotification: async (jobId: number) => {
    const record = dispatchNotifyMocks.records.get(jobId);
    if (record) {
      record.notified = true;
      return null;
    }
    dispatchNotifyMocks.records.set(jobId, {
      jobId,
      agentId: "",
      assignedAt: "",
      restaurantId: 0,
      printerId: 0,
      orderId: 0,
      notified: true,
    });
    return null;
  },
  listPendingDispatchNotifications: async (agentId?: string) => {
    const pending = [];
    for (const record of dispatchNotifyMocks.records.values()) {
      if (record.notified) {
        continue;
      }
      if (agentId && record.agentId !== agentId) {
        continue;
      }
      pending.push({
        jobId: record.jobId,
        agentId: record.agentId,
        assignedAt: record.assignedAt,
        restaurantId: record.restaurantId,
        printerId: record.printerId,
        orderId: record.orderId,
      });
    }
    return pending;
  },
  clearPersistedDispatchNotificationsForTests: async (jobIds: number[]) => {
    for (const jobId of jobIds) {
      const record = dispatchNotifyMocks.records.get(jobId);
      if (record) {
        record.notified = false;
      }
    }
  },
}));

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

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

let mutableJobState: SelectPrintJob;

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 720007,
  orderId: 4080001,
  printerId: TEST_DB_PRINTER_ID,
  stationId: null,
  assignedAgentId: null,
  assignedAt: null,
  dispatchNotifiedAt: null,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:4080001:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function registerOnlineAgent(agentId: string): void {
  registerOnlineAgentWithResolution(agentId, 720007);
  seedPrinterResolution({ agentId });
}

function createMockConnection(): AgentWebSocketConnection & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    readyState: AgentWebSocketReadyState.OPEN,
    send(data: string) {
      sent.push(data);
    },
    close() {},
  };
}

function seedPendingDispatchRecord(input: {
  jobId: number;
  agentId: string;
  assignedAt?: string;
}): void {
  dispatchNotifyMocks.records.set(input.jobId, {
    jobId: input.jobId,
    agentId: input.agentId,
    assignedAt: input.assignedAt ?? "2026-06-18T12:01:00.000Z",
    restaurantId: 720007,
    printerId: TEST_DB_PRINTER_ID,
    orderId: 4080001,
    notified: false,
  });
}

describe("dispatchBridge THERMAL-PRINTING-13H", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    clearAgentConnections();
    dispatchNotifyMocks.records.clear();
    repoMocks.findPrintJobById.mockImplementation(async () => mutableJobState);
    repoMocks.markJobAssigned.mockImplementation(async (_jobId, agentId) => {
      mutableJobState = {
        ...mutableJobState,
        status: PRINT_JOB_STATUS.ASSIGNED,
        assignedAgentId: agentId,
        assignedAt: "2026-06-18T12:01:00.000Z",
      };
      return mutableJobState;
    });
    repoMocks.markJobPrinting.mockResolvedValue(null);
    repoMocks.markJobPrinted.mockResolvedValue(null);
    repoMocks.markJobFailed.mockResolvedValue(null);
    attemptMocks.insertPrintAttempt.mockResolvedValue(1);
    mutableJobState = { ...baseJob };
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: 720007,
      profileId: "pos-80c-copy-1-usb001",
      name: "POS-80C",
      isDefault: true,
    });
  });

  it("assigns and notifies the connected agent", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const result = await executePrintHostDispatch({
      jobId: 100,
      correlationId: "corr-dispatch-1",
    });

    expect(result.status).toBe("dispatched");
    expect(result.notified).toBe(true);
    expect(result.agentId).toBe(agentId);
    expect(getPrintJobAssignment(100)?.agentId).toBe(agentId);
    expect(dispatchNotifyMocks.records.get(100)?.notified).toBe(true);

    const payload = JSON.parse(connection.sent[0]!);
    expect(payload.type).toBe(AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED);
    expect(payload.jobId).toBe(100);
  });

  it("returns already_processed without duplicate notification", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const first = await executePrintHostDispatch({ jobId: 100 });
    expect(first.status).toBe("dispatched");

    const second = await executePrintHostDispatch({ jobId: 100 });
    expect(second.status).toBe("already_processed");
    expect(connection.sent).toHaveLength(1);
  });

  it("reuses assignment but retries notification when agent reconnects", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);

    const first = await executePrintHostDispatch({ jobId: 100 });
    expect(first.notified).toBe(false);
    expect(first.notificationSkippedReason).toBe("agent_disconnected");

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const second = await executePrintHostDispatch({ jobId: 100 });
    expect(second.status).toBe("dispatched");
    expect(second.assignmentCreated).toBe(false);
    expect(second.notified).toBe(true);
    expect(connection.sent).toHaveLength(1);
  });

  it("fails when the print job is missing", async () => {
    repoMocks.findPrintJobById.mockResolvedValue(null);

    const result = await executePrintHostDispatch({ jobId: 999 });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("print_job_not_found");
  });

  it("fails assignment when no eligible agent is online", async () => {
    const result = await executePrintHostDispatch({ jobId: 100 });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toMatch(/agent|printer|Unknown database printer/i);
  });
});

describe("dispatchReliability THERMAL-PRINTING-13I.3C.2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDispatchReliabilityForTests();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    clearAgentConnections();
    dispatchNotifyMocks.records.clear();
    repoMocks.findPrintJobById.mockImplementation(async () => mutableJobState);
    repoMocks.markJobAssigned.mockImplementation(async (_jobId, agentId) => {
      mutableJobState = {
        ...mutableJobState,
        status: PRINT_JOB_STATUS.ASSIGNED,
        assignedAgentId: agentId,
        assignedAt: "2026-06-18T12:01:00.000Z",
      };
      return mutableJobState;
    });
    repoMocks.markJobPrinting.mockResolvedValue(null);
    repoMocks.markJobPrinted.mockResolvedValue(null);
    repoMocks.markJobFailed.mockResolvedValue(null);
    attemptMocks.insertPrintAttempt.mockResolvedValue(1);
    mutableJobState = { ...baseJob };
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: 720007,
      profileId: "pos-80c-copy-1-usb001",
      name: "POS-80C",
      isDefault: true,
    });
  });

  it("replays pending notifications on agent reconnect", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const replay = await replayPendingDispatchNotificationsForAgent(agentId);

    expect(replay.attempted).toBe(1);
    expect(replay.notified).toBe(1);
    expect(connection.sent).toHaveLength(1);
    expect(getPrintJobAssignment(100)?.agentId).toBe(agentId);
  });

  it("recovers pending notifications after print host restart", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });
    seedPendingDispatchRecord({ jobId: 101, agentId: "other-agent" });

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const recovery = await replayAllPendingDispatchNotifications();

    expect(recovery.attempted).toBe(2);
    expect(recovery.notified).toBe(1);
    expect(recovery.skippedOffline).toBe(1);
    expect(connection.sent).toHaveLength(1);
  });

  it("retries notify on periodic sweep when agent comes online", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });

    const offlineSweep = await runDispatchRetrySweep();
    expect(offlineSweep.notified).toBe(0);
    expect(offlineSweep.skippedOffline).toBe(1);

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const retrySweep = await runDispatchRetrySweep();
    expect(retrySweep.notified).toBe(1);
    expect(connection.sent).toHaveLength(1);
  });

  it("does not send duplicate notifications after successful notify", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const first = await replayPendingDispatchNotificationsForAgent(agentId);
    expect(first.notified).toBe(1);
    expect(connection.sent).toHaveLength(1);

    mutableJobState = {
      ...mutableJobState,
      status: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: agentId,
      assignedAt: "2026-06-18T12:01:00.000Z",
    };

    const redispatch = await executePrintHostDispatch({ jobId: 100 });
    expect(redispatch.status).toBe("already_processed");
    expect(connection.sent).toHaveLength(1);
  });

  it("handles repeated reconnects without duplicate physical notifications", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await replayPendingDispatchNotificationsForAgent(agentId);
    }

    expect(connection.sent).toHaveLength(1);
    const payload = JSON.parse(connection.sent[0]!);
    expect(payload.timestamp).toBe("2026-06-18T12:01:00.000Z");
  });

  it("handles repeated restart recovery without duplicate notifications", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    seedPendingDispatchRecord({ jobId: 100, agentId });

    const connection = createMockConnection();
    registerConnection(agentId, connection);

    await initializeDispatchReliability();
    resetDispatchReliabilityForTests();
    await replayAllPendingDispatchNotifications();
    await replayAllPendingDispatchNotifications();

    expect(connection.sent).toHaveLength(1);
  });
});
