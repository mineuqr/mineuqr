import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry, registerAgent } from "./agentRegistry";
import { replaceAgentPrinterInventory } from "./printerProfileStore";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearRoutingState, resolveRoutingDecision } from "./routingEngine";
import { ROUTING_REASONS, ROUTING_FAILURE_CODES } from "./routingTypes";
import { getPrinterOwner, getRoutingDecision } from "./routingQueries";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
}));

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
}));

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

function registerOnlineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

function registerOfflineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: "2020-01-01T00:00:00.000Z",
  });
}

function seedPrinterOwner(agentId: string, printerId = "10"): void {
  replaceAgentPrinterInventory({
    agentId,
    timestamp: new Date().toISOString(),
    profiles: [{ ...sampleProfile, printerId }],
  });
}

describe("agentRouting THERMAL-PRINTING-8A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearRoutingState();
    clearPrintJobAssignments();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  describe("Scenario A — single owner", () => {
    it("routes to the deterministic printer owner", () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterOwner("agent-alpha");

      const decision = resolveRoutingDecision({ jobId: 100, printerId: 10 });

      expect(decision).toMatchObject({
        agentId: "agent-alpha",
        reason: ROUTING_REASONS.PRINTER_OWNER,
      });
      expect(getPrinterOwner("10")).toBe("agent-alpha");
    });
  });

  describe("Scenario B — unknown printer", () => {
    it("rejects routing when printer inventory is unknown and multiple agents are online", () => {
      registerOnlineAgent("agent-alpha");
      registerOnlineAgent("agent-beta");
      clearPrinterProfileStore();

      expect(() => resolveRoutingDecision({ jobId: 100, printerId: 10 })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.MULTIPLE_CANDIDATES })
      );
    });

    it("rejects routing when no agents are online for an unknown printer", () => {
      expect(() => resolveRoutingDecision({ jobId: 100, printerId: 10 })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.NO_CANDIDATES })
      );
    });
  });

  describe("Scenario C — offline owner", () => {
    it("rejects routing when the printer owner is offline", () => {
      registerOfflineAgent("agent-alpha");
      seedPrinterOwner("agent-alpha");

      expect(() => resolveRoutingDecision({ jobId: 100, printerId: 10 })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.OFFLINE_OWNER })
      );
    });
  });

  describe("Scenario D — single candidate", () => {
    it("routes to the only online agent when printer inventory is unknown", () => {
      registerOnlineAgent("agent-solo");

      const decision = resolveRoutingDecision({ jobId: 100, printerId: 10 });

      expect(decision).toMatchObject({
        agentId: "agent-solo",
        reason: ROUTING_REASONS.SINGLE_CANDIDATE,
      });
    });
  });

  describe("Scenario E — multiple candidates", () => {
    it("resolves ownership deterministically when multiple agents report the same printer", () => {
      registerOnlineAgent("agent-zulu");
      registerOnlineAgent("agent-alpha");
      seedPrinterOwner("agent-zulu", "10");
      seedPrinterOwner("agent-alpha", "10");

      expect(getPrinterOwner("10")).toBe("agent-alpha");

      const decision = resolveRoutingDecision({ jobId: 100, printerId: 10 });
      expect(decision.agentId).toBe("agent-alpha");
      expect(decision.reason).toBe(ROUTING_REASONS.PRINTER_OWNER);
    });
  });

  describe("Scenario F — assignment integration", () => {
    it("uses the routing engine when creating assignments", async () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterOwner("agent-alpha");

      const result = await assignPrintJob({ jobId: 100 });

      expect(result.created).toBe(true);
      expect(result.assignment.agentId).toBe("agent-alpha");
      expect(getRoutingDecision(100)).toMatchObject({
        agentId: "agent-alpha",
        reason: ROUTING_REASONS.PRINTER_OWNER,
      });
    });
  });
});
