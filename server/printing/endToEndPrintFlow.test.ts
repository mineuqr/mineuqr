import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  AgentWebSocketReadyState,
  clearAgentConnections,
  registerConnection,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";
import { handleAgentWebSocketInboundMessage } from "./agentWebSocketInboundHandler";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  getPrintJobAssignment,
} from "./assignmentService";
import { notifyAgentOfAssignment } from "./assignmentNotifier";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  registerOnlineAgent as registerOnlineAgentWithResolution,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";
import {
  clearDeliveryAcks,
  getDeliveryAckRecord,
  recordDeliveryAcknowledgement,
} from "./deliveryAckService";
import { clearJobDeliveryStates } from "./deliveryStateTracker";
import { clearDispatchBridgeState } from "./dispatchBridgeState";
import { dispatchAssignedPrintJob, orchestratePrintJobFlow } from "./endToEndPrintFlowService";
import { fetchAuthoritativePrintJob } from "./jobRetrievalService";
import { serializeJobFetchResponse } from "./jobRetrievalRouter";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrintJobByIdempotencyKey: vi.fn(),
  insertPrintJob: vi.fn(),
  markJobAssigned: vi.fn(),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

let mutableJobState: SelectPrintJob;

const dbMocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
}));

const opsLogMock = vi.hoisted(() => vi.fn());

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  findPrintJobByIdempotencyKey: (...args: unknown[]) =>
    repoMocks.findPrintJobByIdempotencyKey(...args),
  insertPrintJob: (...args: unknown[]) => repoMocks.insertPrintJob(...args),
  markJobAssigned: (...args: unknown[]) => repoMocks.markJobAssigned(...args),
  markJobPrinting: (...args: unknown[]) => repoMocks.markJobPrinting(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
  markJobFailed: (...args: unknown[]) => repoMocks.markJobFailed(...args),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptMocks.insertPrintAttempt(...args),
}));

const printerRepoMocks = vi.hoisted(() => ({
  findPrinterById: vi.fn(),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => printerRepoMocks.findPrinterById(...args),
}));

vi.mock("../db", () => ({
  getOrderById: (...args: unknown[]) => dbMocks.getOrderById(...args),
  getOrderItemsByOrderId: (...args: unknown[]) =>
    dbMocks.getOrderItemsByOrderId(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: (...args: unknown[]) => opsLogMock(...args),
}));

const baseOrder = {
  id: 500,
  restaurantId: 7,
  tableId: 3,
  tableNumber: 3,
  sessionId: null,
  customerName: null,
  customerPhone: null,
  status: "pending" as const,
  notes: null,
  totalAmount: "10.00",
  orderNumber: "ORD-500",
  trackingToken: "tok",
  readyPushSentAt: null,
  readyAt: null,
  whatsappSent: false,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: 10,
  stationId: null,
  assignedAgentId: null,
  assignedAt: null,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
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

describe("endToEndPrintFlow THERMAL-PRINTING-7A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentConnections();
    clearPrintJobAssignments();
    clearDeliveryAcks();
    clearJobDeliveryStates();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearDispatchBridgeState();

    printerRepoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      profileId: "kitchen-printer-10",
      name: "Kitchen",
      restaurantId: 7,
      isDefault: true,
    });
    dbMocks.getOrderById.mockResolvedValue(baseOrder);
    dbMocks.getOrderItemsByOrderId.mockResolvedValue([
      {
        id: 1,
        orderId: 500,
        menuItemId: 20,
        nameAr: "برجر",
        nameEn: "Burger",
        price: "15.00",
        quantity: 1,
        notes: null,
        createdAt: "2026-06-18 12:00:00",
      },
    ]);
    repoMocks.findPrintJobById.mockImplementation(async () => mutableJobState);
    repoMocks.findPrintJobByIdempotencyKey.mockResolvedValue(null);
    repoMocks.insertPrintJob.mockResolvedValue(100);
    repoMocks.markJobAssigned.mockImplementation(async (_jobId, agentId) => {
      mutableJobState = {
        ...mutableJobState,
        status: PRINT_JOB_STATUS.ASSIGNED,
        assignedAgentId: agentId,
        assignedAt: "2026-06-18T12:01:00.000Z",
      };
      return mutableJobState;
    });
    repoMocks.markJobPrinting.mockImplementation(async () => {
      mutableJobState = {
        ...mutableJobState,
        status: PRINT_JOB_STATUS.PRINTING,
        attemptCount: mutableJobState.attemptCount + 1,
      };
      return mutableJobState;
    });
    repoMocks.markJobPrinted.mockImplementation(async () => {
      mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.PRINTED };
      return mutableJobState;
    });
    repoMocks.markJobFailed.mockImplementation(async () => {
      mutableJobState = { ...mutableJobState, status: PRINT_JOB_STATUS.FAILED };
      return mutableJobState;
    });
    attemptMocks.insertPrintAttempt.mockResolvedValue(1);
    mutableJobState = { ...baseJob };
  });

  describe("Scenario A — successful flow", () => {
    it("runs order → job → assignment → notification → retrieval → ack without printed state", async () => {
      registerOnlineAgent("agent-alpha");
      const connection = createMockConnection();
      registerConnection("agent-alpha", connection);

      const flow = await orchestratePrintJobFlow({
        orderId: 500,
        trigger: "auto",
        printerId: 10,
      });

      expect(flow.jobCreated).toBe(true);
      expect(flow.assignment.agentId).toBe("agent-alpha");
      expect(flow.notified).toBe(true);
      expect(connection.sent).toHaveLength(1);
      expect(JSON.parse(connection.sent[0]!).type).toBe(
        AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED
      );

      const fetchRequest = JSON.stringify({
        type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_REQUEST,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        jobId: 100,
        requestId: "req-1",
      });
      await handleAgentWebSocketInboundMessage(fetchRequest, connection);

      expect(connection.sent).toHaveLength(2);
      const fetchResponse = JSON.parse(connection.sent[1]!);
      expect(fetchResponse.found).toBe(true);
      expect(fetchResponse.job).toMatchObject({
        jobId: 100,
        printerId: 10,
        orderId: 500,
        ticket: {
          orderId: 500,
          restaurantId: 7,
          items: [{ itemName: "برجر", quantity: 1, notes: null }],
        },
      });

      const ackMessage = JSON.stringify({
        type: AGENT_JOB_MESSAGE_TYPES.DELIVERY_ACK,
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:01.000Z",
      });
      await handleAgentWebSocketInboundMessage(ackMessage, connection);

      const ackRecord = getDeliveryAckRecord("agent-alpha", 100);
      expect(ackRecord?.timestamp).toBe("2026-06-18T10:00:01.000Z");
      expect(repoMocks.markJobPrinted).not.toHaveBeenCalled();
      expect(mutableJobState.status).toBe(PRINT_JOB_STATUS.PRINTING);
    });
  });

  describe("Scenario B — unknown agent", () => {
    it("rejects retrieval and delivery ack for unregistered agents", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      const retrieval = await fetchAuthoritativePrintJob({
        agentId: "unknown-agent",
        jobId: 100,
      });
      expect(retrieval).toEqual({ found: false, error: "Agent not registered" });

      const ack = await recordDeliveryAcknowledgement({
        agentId: "unknown-agent",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      });
      expect(ack).toEqual({ accepted: false, reason: "Agent not registered" });
    });
  });

  describe("Scenario C — missing job", () => {
    it("handles missing queue jobs and assignments safely", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      repoMocks.findPrintJobById.mockResolvedValue(null);

      const retrieval = await fetchAuthoritativePrintJob({
        agentId: "agent-alpha",
        jobId: 100,
      });
      expect(retrieval).toEqual({ found: false, error: "Print job not found" });

      const ack = await recordDeliveryAcknowledgement({
        agentId: "agent-alpha",
        jobId: 999,
        timestamp: "2026-06-18T10:00:00.000Z",
      });
      expect(ack).toEqual({
        accepted: false,
        reason: "Print job assignment not found",
      });
    });
  });

  describe("Scenario D — duplicate acknowledgement", () => {
    it("accepts duplicate delivery acks idempotently", async () => {
      registerOnlineAgent("agent-alpha");
      await assignPrintJob({ jobId: 100 });

      const payload = {
        agentId: "agent-alpha",
        jobId: 100,
        timestamp: "2026-06-18T10:00:00.000Z",
      };

      const first = await recordDeliveryAcknowledgement(payload);
      const second = await recordDeliveryAcknowledgement({
        ...payload,
        timestamp: "2026-06-18T10:00:01.000Z",
      });

      expect(first).toMatchObject({ accepted: true, duplicate: false });
      expect(second).toMatchObject({ accepted: true, duplicate: true });
      expect(second.record.timestamp).toBe(first.record.timestamp);
      expect(repoMocks.markJobPrinted).not.toHaveBeenCalled();
    });
  });

  describe("Scenario E — disconnected agent", () => {
    it("skips notification safely while preserving assignment", async () => {
      registerOnlineAgent("agent-offline");

      const dispatch = await dispatchAssignedPrintJob({ jobId: 100 });

      expect(dispatch.notified).toBe(false);
      expect(dispatch.notificationSkippedReason).toBe("agent_disconnected");
      expect(getPrintJobAssignment(100)?.agentId).toBe("agent-offline");
      expect(
        opsLogMock.mock.calls.some(
          ([entry]) => entry.type === OPS_EVENT.print_agent_job_notification_skipped
        )
      ).toBe(true);
    });

    it("notifyAgentOfAssignment returns false without throwing", () => {
      registerOnlineAgent("agent-offline");
      const assignment = {
        jobId: 100,
        agentId: "agent-offline",
        restaurantId: 7,
        orderId: 500,
        printerId: 10,
        assignedAt: "2026-06-18T10:00:00.000Z",
      };

      const result = notifyAgentOfAssignment({ assignment });
      expect(result).toEqual({ notified: false, reason: "agent_disconnected" });
    });
  });

  it("returns authoritative fetch responses through the router helper", () => {
    const payload = serializeJobFetchResponse({
      requestId: "req-2",
      found: true,
      job: {
        jobId: 100,
        restaurantId: 7,
        printerId: 10,
        orderId: 500,
        ticket: {
          orderId: 500,
          restaurantId: 7,
          items: [{ itemName: "Burger", quantity: 1 }],
        },
      },
    });

    expect(JSON.parse(payload).requestId).toBe("req-2");
  });
});
