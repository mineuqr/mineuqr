import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState, resolveRoutingDecision } from "./routingEngine";
import { ROUTING_REASONS, ROUTING_FAILURE_CODES } from "./routingTypes";
import { getRoutingDecision } from "./routingQueries";
import {
  registerOfflineAgent,
  registerOnlineAgent,
  seedConflictingPrinterOwnership,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
} from "./printingTestHelpers";

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
  printerId: TEST_DB_PRINTER_ID,
  status: PRINT_JOB_STATUS.QUEUED,
  attemptCount: 0,
  idempotencyKey: "order:500:submitted",
  claimedBy: null,
  leaseExpiresAt: null,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

describe("agentRouting THERMAL-PRINTING-8A / 8B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  describe("Scenario A — single owner", () => {
    it("routes to the resolved printer owner", () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      const decision = resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID });

      expect(decision).toMatchObject({
        agentId: "agent-alpha",
        reason: ROUTING_REASONS.PRINTER_OWNER,
      });
    });
  });

  describe("Scenario B — unknown printer", () => {
    it("falls back to single candidate when db printer mapping is missing", () => {
      registerOnlineAgent("agent-solo");

      const decision = resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID });
      expect(decision.reason).toBe(ROUTING_REASONS.SINGLE_CANDIDATE);
    });

    it("rejects routing when db printer mapping is missing and multiple agents are online", () => {
      registerOnlineAgent("agent-alpha");
      registerOnlineAgent("agent-beta");

      expect(() => resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.MULTIPLE_CANDIDATES })
      );
    });
  });

  describe("Scenario C — offline owner", () => {
    it("rejects routing when the resolved printer owner is offline", () => {
      registerOfflineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      expect(() => resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.OFFLINE_OWNER })
      );
    });
  });

  describe("Scenario D — single candidate", () => {
    it("routes to the only online agent when db printer mapping is missing", () => {
      registerOnlineAgent("agent-solo");

      const decision = resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID });

      expect(decision).toMatchObject({
        agentId: "agent-solo",
        reason: ROUTING_REASONS.SINGLE_CANDIDATE,
      });
    });
  });

  describe("Scenario E — multiple candidates", () => {
    it("rejects routing when resolution detects conflicting ownership", () => {
      registerOnlineAgent("agent-zulu");
      registerOnlineAgent("agent-alpha");
      seedConflictingPrinterOwnership(["agent-zulu", "agent-alpha"]);

      expect(() => resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID })).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.RESOLUTION_CONFLICT })
      );
    });
  });

  describe("Scenario F — assignment integration", () => {
    it("uses the routing engine with resolution when creating assignments", async () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

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
