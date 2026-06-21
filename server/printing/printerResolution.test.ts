import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { assignPrintJob, clearPrintJobAssignments } from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { clearPrinterProfileStore } from "./printerProfileStore";
import {
  clearPrinterResolutionRegistry,
  registerDbPrinterProfileMapping,
} from "./printerResolutionRegistry";
import { resolvePrinter } from "./printerResolutionService";
import {
  RESOLUTION_FAILURE_CODES,
  ResolutionRejectedError,
} from "./resolutionTypes";
import {
  getAgentResolvedPrinters,
  getPrinterResolution,
} from "./resolutionQueries";
import { detectProfilePrinterOwnershipConflict } from "./resolutionConflictService";
import { clearRoutingState, resolveRoutingDecision } from "./routingEngine";
import { ROUTING_REASONS, ROUTING_FAILURE_CODES } from "./routingTypes";
import { getRoutingDecision } from "./routingQueries";
import {
  registerOnlineAgent,
  seedConflictingPrinterOwnership,
  seedPrinterProfile,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
  TEST_PROFILE_PRINTER_ID,
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

describe("printerResolution THERMAL-PRINTING-8B", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    repoMocks.findPrintJobById.mockResolvedValue(baseJob);
  });

  describe("Scenario A — valid resolution", () => {
    it("resolves db printer to profile printer and owner agent", () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      expect(resolvePrinter(TEST_DB_PRINTER_ID)).toEqual({
        dbPrinterId: TEST_DB_PRINTER_ID,
        profilePrinterId: TEST_PROFILE_PRINTER_ID,
        agentId: "agent-alpha",
      });
    });
  });

  describe("Scenario B — unknown printer", () => {
    it("rejects resolution when db printer mapping is missing", () => {
      expect(() => resolvePrinter(TEST_DB_PRINTER_ID)).toThrow(
        expect.objectContaining({ code: RESOLUTION_FAILURE_CODES.UNKNOWN_DB_PRINTER })
      );
    });
  });

  describe("Scenario C — unknown profile", () => {
    it("rejects resolution when profile printer is not reported by any agent", () => {
      registerDbPrinterProfileMapping({
        dbPrinterId: TEST_DB_PRINTER_ID,
        profilePrinterId: TEST_PROFILE_PRINTER_ID,
      });

      expect(() => resolvePrinter(TEST_DB_PRINTER_ID)).toThrow(
        expect.objectContaining({ code: RESOLUTION_FAILURE_CODES.UNKNOWN_PROFILE })
      );
    });
  });

  describe("Scenario D — conflict detected", () => {
    it("rejects ambiguous profile ownership without silently choosing an owner", () => {
      registerOnlineAgent("agent-alpha");
      registerOnlineAgent("agent-beta");
      seedConflictingPrinterOwnership(["agent-alpha", "agent-beta"]);

      expect(detectProfilePrinterOwnershipConflict(TEST_PROFILE_PRINTER_ID)).toEqual({
        conflict: true,
        agentIds: ["agent-alpha", "agent-beta"],
      });
      expect(() => resolvePrinter(TEST_DB_PRINTER_ID)).toThrow(ResolutionRejectedError);
      expect(() => resolvePrinter(TEST_DB_PRINTER_ID)).toThrow(
        expect.objectContaining({ code: RESOLUTION_FAILURE_CODES.RESOLUTION_CONFLICT })
      );
    });
  });

  describe("Scenario E — routing integration", () => {
    it("routes through the resolution layer to the resolved owner", () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      const decision = resolveRoutingDecision({
        jobId: 100,
        printerId: TEST_DB_PRINTER_ID,
      });

      expect(decision).toMatchObject({
        agentId: "agent-alpha",
        reason: ROUTING_REASONS.PRINTER_OWNER,
      });
    });

    it("uses resolution during assignment", async () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      const result = await assignPrintJob({ jobId: 100 });
      expect(result.assignment.agentId).toBe("agent-alpha");
      expect(getRoutingDecision(100)?.reason).toBe(ROUTING_REASONS.PRINTER_OWNER);
    });

    it("rejects routing when resolution conflicts", () => {
      registerOnlineAgent("agent-alpha");
      registerOnlineAgent("agent-beta");
      seedConflictingPrinterOwnership(["agent-alpha", "agent-beta"]);

      expect(() =>
        resolveRoutingDecision({ jobId: 100, printerId: TEST_DB_PRINTER_ID })
      ).toThrow(expect.objectContaining({ code: ROUTING_FAILURE_CODES.RESOLUTION_CONFLICT }));
    });
  });

  describe("Scenario F — resolution queries", () => {
    it("returns resolved mappings via read-only queries", () => {
      registerOnlineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      expect(getPrinterResolution(TEST_DB_PRINTER_ID)).toEqual({
        dbPrinterId: TEST_DB_PRINTER_ID,
        profilePrinterId: TEST_PROFILE_PRINTER_ID,
        agentId: "agent-alpha",
      });
      expect(getAgentResolvedPrinters("agent-alpha")).toEqual([
        {
          dbPrinterId: TEST_DB_PRINTER_ID,
          profilePrinterId: TEST_PROFILE_PRINTER_ID,
          agentId: "agent-alpha",
        },
      ]);
    });
  });
});
