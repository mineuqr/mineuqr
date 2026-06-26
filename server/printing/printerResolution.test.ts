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
  TEST_RESTAURANT_ID,
} from "./printingTestHelpers";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";

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

let mutableJobState: SelectPrintJob;

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobAssigned: (...args: unknown[]) => repoMocks.markJobAssigned(...args),
  markJobPrinting: (...args: unknown[]) => repoMocks.markJobPrinting(...args),
  markJobPrinted: (...args: unknown[]) => repoMocks.markJobPrinted(...args),
  markJobFailed: (...args: unknown[]) => repoMocks.markJobFailed(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptMocks.insertPrintAttempt(...args),
}));

function setupExecutionStateRepositoryMocks(initialJob: SelectPrintJob): void {
  mutableJobState = { ...initialJob };
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
}

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: 7,
  orderId: 500,
  printerId: TEST_DB_PRINTER_ID,
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

describe("printerResolution THERMAL-PRINTING-8B", () => {
  beforeEach(() => {
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    setupExecutionStateRepositoryMocks(baseJob);
    repoMocks.findPrinterById.mockResolvedValue({
      id: TEST_DB_PRINTER_ID,
      restaurantId: TEST_RESTAURANT_ID,
      name: "Kitchen",
      paperWidthMm: 80,
      profileId: TEST_PROFILE_PRINTER_ID,
      isDefault: true,
      createdAt: "2026-06-18 12:00:00",
      updatedAt: "2026-06-18 12:00:00",
    });
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
        restaurantId: TEST_RESTAURANT_ID,
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
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
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
