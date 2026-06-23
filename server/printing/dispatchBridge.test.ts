import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  AgentWebSocketReadyState,
  clearAgentConnections,
  registerConnection,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  getPrintJobAssignment,
} from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  clearDispatchBridgeState,
  hasDispatchNotificationBeenSent,
} from "./dispatchBridgeState";
import { executePrintHostDispatch } from "./dispatchBridgeService";
import {
  registerOnlineAgent as registerOnlineAgentWithResolution,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrinterById: vi.fn(),
}));

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 720007,
  orderId: 4080001,
  printerId: TEST_DB_PRINTER_ID,
  stationId: null,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:4080001:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function registerOnlineAgent(agentId: string): void {
  registerOnlineAgentWithResolution(agentId);
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

describe("dispatchBridge THERMAL-PRINTING-13H", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    clearAgentConnections();
    clearDispatchBridgeState();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
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
    expect(hasDispatchNotificationBeenSent(100)).toBe(true);

    const payload = JSON.parse(connection.sent[0]!);
    expect(payload.type).toBe(AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED);
    expect(payload.jobId).toBe(100);

    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.dispatch_received,
        correlationId: "corr-dispatch-1",
      })
    );
    expect(opsLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.dispatch_notification_sent,
        metadata: expect.objectContaining({
          jobId: 100,
          agentId,
          correlationId: "corr-dispatch-1",
        }),
      })
    );
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
    expect(result.failureReason).toContain("agent");
  });
});
