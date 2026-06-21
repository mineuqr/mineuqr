import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  getPrintJobAssignment,
} from "./assignmentService";
import { NoEligibleAgentError, PrintJobAssignmentError } from "./assignmentTypes";
import {
  clearPrinterProfileStore,
  replaceAgentPrinterInventory,
} from "./printerProfileStore";
import { clearRoutingState } from "./routingEngine";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: 10,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

const sampleProfile = {
  printerId: "10",
  printerName: "Kitchen",
  transport: "usb" as const,
  capabilities: {
    escpos: true,
    cutter: false,
    cashDrawer: false,
    qrCode: true,
    imagePrinting: false,
  },
  paperWidth: 80 as const,
};

function seedOwner(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
  replaceAgentPrinterInventory({
    agentId,
    timestamp: new Date().toISOString(),
    profiles: [sampleProfile],
  });
}

describe("assignmentService THERMAL-PRINTING-7A.1 / 8A.4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrintJobAssignments();
    clearPrinterProfileStore();
    clearRoutingState();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  it("assigns queued jobs via routing to the printer owner", async () => {
    seedOwner("agent-alpha");
    seedOwner("agent-zulu");

    const result = await assignPrintJob({ jobId: 100 });

    expect(result.created).toBe(true);
    expect(result.assignment.agentId).toBe("agent-alpha");
    expect(getPrintJobAssignment(100)).toEqual(result.assignment);
  });

  it("reuses existing assignments idempotently", async () => {
    seedOwner("agent-alpha");

    const first = await assignPrintJob({ jobId: 100 });
    const second = await assignPrintJob({ jobId: 100 });

    expect(second.created).toBe(false);
    expect(second.assignment).toEqual(first.assignment);
    expect(repoMocks.findPrintJobById).toHaveBeenCalledTimes(1);
  });

  it("throws when routing cannot select an agent", async () => {
    registerAgent({
      identity: {
        agentId: "agent-alpha",
        platform: "windows",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });
    registerAgent({
      identity: {
        agentId: "agent-beta",
        platform: "android",
        protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      },
      connectedAt: new Date().toISOString(),
    });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(NoEligibleAgentError);
  });

  it("rejects jobs without printerId", async () => {
    seedOwner("agent-alpha");
    repoMocks.findPrintJobById.mockResolvedValue({ ...baseJob, printerId: null });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(PrintJobAssignmentError);
  });
});
