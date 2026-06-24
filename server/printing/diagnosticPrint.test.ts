import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import {
  diagnosticOrderIdForWireJob,
  diagnosticWireJobIdFromRunId,
  isDiagnosticWireJobId,
} from "../../shared/printing/diagnosticPrint";
import {
  AgentWebSocketReadyState,
  clearAgentConnections,
  registerConnection,
  type AgentWebSocketConnection,
} from "./agentConnectionManager";
import { clearDiagnosticPrintAssignments } from "./diagnosticAssignmentService";
import { buildDiagnosticTicketPayload } from "./diagnosticTicketRenderer";
import { executePrintHostDiagnosticTestPrint } from "./diagnosticPrintDispatchService";
import { fetchAuthoritativePrintJob } from "./jobRetrievalService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState } from "./routingEngine";
import {
  registerOnlineAgent as registerOnlineAgentWithResolution,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";

const repoMocks = vi.hoisted(() => ({
  findPrinterById: vi.fn(),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

vi.mock("../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

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

describe("diagnosticPrint THERMAL-PRINTING-13I.6", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentConnections();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearDiagnosticPrintAssignments();
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: 720007,
      name: "POS-80C",
      profileId: "pos-80c-copy-1-usb001",
      isDefault: true,
    });
  });

  it("uses synthetic wire job ids outside customer print job range", () => {
    expect(diagnosticWireJobIdFromRunId(3)).toBe(9_000_000_003);
    expect(isDiagnosticWireJobId(9_000_000_003)).toBe(true);
    expect(isDiagnosticWireJobId(420003)).toBe(false);
    expect(diagnosticOrderIdForWireJob(9_000_000_003)).toBe(9_000_000_003);
  });

  it("builds a visually distinct diagnostic ticket payload", () => {
    const wireJobId = diagnosticWireJobIdFromRunId(1);
    const ticket = buildDiagnosticTicketPayload({
      wireJobId,
      restaurantId: 720007,
      printerName: "POS-80C",
      agentId: "mineuqr-agent-720007",
      diagnosticId: "diag_abc123",
      triggeredBy: "admin@mineuqr.com",
      triggeredAt: "2026-06-24T10:00:00.000Z",
    });

    expect(ticket.orderId).toBe(wireJobId);
    expect(ticket.orderId).toBeGreaterThan(0);
    expect(ticket.items.some((item) => item.itemName === "\u200B")).toBe(true);
    expect(ticket.items.some((item) => item.itemName.includes("DIAGNOSTIC TEST"))).toBe(true);
    expect(ticket.items.some((item) => item.itemName.includes("NOT A CUSTOMER ORDER"))).toBe(true);
  });

  it("dispatches diagnostic print without creating customer print jobs", async () => {
    const agentId = "mineuqr-agent-720007";
    registerOnlineAgent(agentId);
    const connection = createMockConnection();
    registerConnection(agentId, connection);

    const wireJobId = diagnosticWireJobIdFromRunId(7);
    const result = await executePrintHostDiagnosticTestPrint({
      wireJobId,
      diagnosticId: "diag_test007",
      diagnosticRunId: 7,
      restaurantId: 720007,
      printerId: TEST_DB_PRINTER_ID,
      printerName: "POS-80C",
      triggeredByLabel: "admin@mineuqr.com",
      triggeredAt: "2026-06-24T10:00:00.000Z",
    });

    expect(result.status).toBe("dispatched");
    expect(result.notified).toBe(true);
    expect(JSON.parse(connection.sent[0]!).type).toBe(AGENT_JOB_MESSAGE_TYPES.JOB_ASSIGNED);

    const fetched = await fetchAuthoritativePrintJob({ agentId, jobId: wireJobId });
    expect(fetched.found).toBe(true);
    if (fetched.found) {
      expect(fetched.job.orderId).toBe(wireJobId);
      expect(fetched.job.ticket.orderId).toBe(wireJobId);
      expect(fetched.job.ticket.items.some((item) => item.itemName.includes("DIAGNOSTIC TEST"))).toBe(
        true
      );
    }
  });

  it("returns actionable failure when no agent is online", async () => {
    const result = await executePrintHostDiagnosticTestPrint({
      wireJobId: diagnosticWireJobIdFromRunId(8),
      diagnosticId: "diag_offline",
      diagnosticRunId: 8,
      restaurantId: 720007,
      printerId: TEST_DB_PRINTER_ID,
      printerName: "POS-80C",
      triggeredByLabel: "admin@mineuqr.com",
      triggeredAt: "2026-06-24T10:00:00.000Z",
    });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toContain("No online print agent");
  });
});
