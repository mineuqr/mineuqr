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
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import {
  registerOfflineAgent,
  registerOnlineAgent,
  seedConflictingPrinterOwnership,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
  TEST_RESTAURANT_ID,
} from "./printingTestHelpers";

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

describe("agentRouting THERMAL-PRINTING-8A / 8B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      profileId: "kitchen-printer-10",
      isDefault: true,
      createdAt: "2026-06-18 12:00:00",
      updatedAt: "2026-06-18 12:00:00",
    });
  });

  describe("Scenario A — single owner", () => {
    it("routes to the resolved printer owner", () => {
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
  });

  describe("Scenario B — unknown printer", () => {
    it("rejects routing when db printer mapping is missing", () => {
      registerOnlineAgent("agent-solo");

      expect(() =>
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
      ).toThrow(expect.objectContaining({ code: ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER }));
    });

    it("rejects routing when db printer mapping is missing and multiple agents are online", () => {
      registerOnlineAgent("agent-alpha");
      registerOnlineAgent("agent-beta");

      expect(() =>
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
      ).toThrow(expect.objectContaining({ code: ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER }));
    });
  });

  describe("Scenario C — offline owner", () => {
    it("rejects routing when the resolved printer owner is offline", () => {
      registerOfflineAgent("agent-alpha");
      seedPrinterResolution({ agentId: "agent-alpha" });

      expect(() =>
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
      ).toThrow(
        expect.objectContaining({ code: ROUTING_FAILURE_CODES.OFFLINE_OWNER })
      );
    });
  });

  describe("Scenario D — tenant-safe routing", () => {
    it("rejects routing to an agent owned by a different restaurant", () => {
      registerOnlineAgent("agent-foreign", 99);
      seedPrinterResolution({ agentId: "agent-foreign" });

      expect(() =>
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
      ).toThrow(expect.objectContaining({ code: ROUTING_FAILURE_CODES.RESTAURANT_MISMATCH }));
    });
  });

  describe("Scenario E — multiple candidates", () => {
    it("rejects routing when resolution detects conflicting ownership", () => {
      registerOnlineAgent("agent-zulu");
      registerOnlineAgent("agent-alpha");
      seedConflictingPrinterOwnership(["agent-zulu", "agent-alpha"]);

      expect(() =>
        resolveRoutingDecision({
          jobId: 100,
          printerId: TEST_DB_PRINTER_ID,
          restaurantId: TEST_RESTAURANT_ID,
        })
      ).toThrow(
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
