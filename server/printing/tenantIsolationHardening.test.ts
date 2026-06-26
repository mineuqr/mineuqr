/**
 * THERMAL-PRINTING-13I.4A — tenant isolation regression tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectPrintJob } from "../../drizzle/schema";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import {
  assignPrintJob,
  clearPrintJobAssignments,
  warmPrintJobAssignmentCache,
} from "./assignmentService";
import { clearAgentRegistry } from "./agentRegistry";
import { executePrintHostDispatch } from "./dispatchBridgeService";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import { recordExecutionOutcomeReport } from "./executionOutcomeService";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry } from "./printerResolutionRegistry";
import { clearRoutingState, resolveRoutingDecision } from "./routingEngine";
import { ROUTING_FAILURE_CODES, ROUTING_REASONS } from "./routingTypes";
import {
  registerOnlineAgent,
  seedPrinterResolution,
  TEST_DB_PRINTER_ID,
  TEST_PROFILE_PRINTER_ID,
  TEST_RESTAURANT_ID,
} from "./printingTestHelpers";
import { isAgentOwnedByRestaurant } from "./tenantOwnershipAuthority";
import { listAgentConnectivityStates } from "./agentLifecycleService";
import { NoEligibleAgentError, PrintJobAssignmentError } from "./assignmentTypes";

const repoMocks = vi.hoisted(() => ({
  findPrintJobById: vi.fn(),
  findPrinterById: vi.fn(),
  markJobAssigned: vi.fn(),
  hasPersistedDispatchNotification: vi.fn(),
  recordPersistedDispatchNotification: vi.fn(),
}));

const attemptMocks = vi.hoisted(() => ({
  insertPrintAttempt: vi.fn(),
}));

let mutableJobState: SelectPrintJob;

vi.mock("./printJobRepository", () => ({
  findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  markJobAssigned: (...args: unknown[]) => repoMocks.markJobAssigned(...args),
  markJobPrinting: vi.fn(),
  markJobPrinted: vi.fn(),
  markJobFailed: vi.fn(),
  hasPersistedDispatchNotification: (...args: unknown[]) =>
    repoMocks.hasPersistedDispatchNotification(...args),
  recordPersistedDispatchNotification: (...args: unknown[]) =>
    repoMocks.recordPersistedDispatchNotification(...args),
}));

vi.mock("./printerRepository", () => ({
  findPrinterById: (...args: unknown[]) => repoMocks.findPrinterById(...args),
  listPrintersForRestaurant: vi.fn(),
}));

vi.mock("./printJobAttemptRepository", () => ({
  insertPrintAttempt: (...args: unknown[]) => attemptMocks.insertPrintAttempt(...args),
}));

vi.mock("./printJobTelemetryService", () => ({
  emitPrintJobTelemetryAsync: vi.fn(),
}));

vi.mock("./dispatchBridgeState", () => ({
  hasDispatchNotificationBeenSent: vi.fn().mockResolvedValue(false),
}));

vi.mock("./assignmentNotifier", () => ({
  notifyAgentOfJobId: vi.fn().mockReturnValue({ notified: true }),
}));

vi.mock("./ticketRenderer", () => ({
  renderKitchenTicket: vi.fn().mockResolvedValue({
    orderId: 500,
    restaurantId: TEST_RESTAURANT_ID,
    items: [{ itemName: "Burger", quantity: 1, notes: null }],
  }),
}));

vi.mock("./executionIntegrationFlow", () => ({
  resolveRuntimeExecutionPlan: vi.fn().mockReturnValue({
    summary: { transport: "usb" },
    context: {},
  }),
}));

vi.mock("./transportDeliveryContextBuilder", () => ({
  buildTransportDeliveryContext: vi.fn().mockReturnValue(undefined),
}));

vi.mock("./stationRoutingService", () => ({
  resolveStationItemFilterFromJob: vi.fn().mockReturnValue({
    stationId: null,
    filterMode: "all",
  }),
}));

const restaurantA = TEST_RESTAURANT_ID;
const restaurantB = 99;

const baseJob: SelectPrintJob = {
  id: 100,
  restaurantId: restaurantA,
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

function mockPrinterForRestaurant(restaurantId: number) {
  repoMocks.findPrinterById.mockResolvedValue({
    id: TEST_DB_PRINTER_ID,
    restaurantId,
    name: "Kitchen",
    paperWidthMm: 80,
    profileId: TEST_PROFILE_PRINTER_ID,
    isDefault: true,
    createdAt: "2026-06-18 12:00:00",
    updatedAt: "2026-06-18 12:00:00",
  });
}

function setupMutableJobRepository(initialJob: SelectPrintJob): void {
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
  attemptMocks.insertPrintAttempt.mockResolvedValue(1);
  repoMocks.hasPersistedDispatchNotification.mockResolvedValue(false);
  repoMocks.recordPersistedDispatchNotification.mockResolvedValue(undefined);
}

describe("tenantIsolationHardening THERMAL-PRINTING-13I.4A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearRoutingState();
    clearPrintJobAssignments();
    setupMutableJobRepository(baseJob);
    mockPrinterForRestaurant(restaurantA);
  });

  it("rejects cross-restaurant assignment when printer belongs to another restaurant", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    seedPrinterResolution({ agentId: "agent-alpha" });
    mockPrinterForRestaurant(restaurantB);

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(PrintJobAssignmentError);
  });

  it("rejects cross-restaurant assignment when profile collision resolves to foreign agent", async () => {
    registerOnlineAgent("agent-foreign", restaurantB);
    seedPrinterResolution({ agentId: "agent-foreign" });

    await expect(assignPrintJob({ jobId: 100 })).rejects.toThrow(NoEligibleAgentError);
  });

  it("rejects single-candidate routing when printer mapping is missing", () => {
    registerOnlineAgent("agent-solo", restaurantA);

    expect(() =>
      resolveRoutingDecision({
        jobId: 100,
        printerId: TEST_DB_PRINTER_ID,
        restaurantId: restaurantA,
      })
    ).toThrow(expect.objectContaining({ code: ROUTING_FAILURE_CODES.UNRESOLVED_PRINTER }));
  });

  it("rejects cross-restaurant fetch even when assignment agentId matches", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    mutableJobState = {
      ...baseJob,
      status: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: "agent-alpha",
      assignedAt: "2026-06-18T12:01:00.000Z",
    };
    warmPrintJobAssignmentCache({
      jobId: 100,
      agentId: "agent-alpha",
      restaurantId: restaurantB,
      orderId: 500,
      printerId: TEST_DB_PRINTER_ID,
      assignedAt: "2026-06-18T12:01:00.000Z",
    });

    const { fetchAuthoritativePrintJob } = await import("./jobRetrievalService");
    const result = await fetchAuthoritativePrintJob({
      agentId: "agent-alpha",
      jobId: 100,
    });

    expect(result).toEqual({
      found: false,
      error: "Print job assignment restaurant does not match job ownership",
    });
  });

  it("rejects cross-restaurant execution outcome reports", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    mutableJobState = {
      ...baseJob,
      status: PRINT_JOB_STATUS.PRINTING,
      assignedAgentId: "agent-alpha",
      assignedAt: "2026-06-18T12:01:00.000Z",
    };
    warmPrintJobAssignmentCache({
      jobId: 100,
      agentId: "agent-alpha",
      restaurantId: restaurantA,
      orderId: 500,
      printerId: TEST_DB_PRINTER_ID,
      assignedAt: "2026-06-18T12:01:00.000Z",
    });
    mockPrinterForRestaurant(restaurantB);

    const result = await recordExecutionOutcomeReport({
      agentId: "agent-alpha",
      jobId: 100,
      outcomeStatus: "executed",
      category: "transport_success",
      timestamp: "2026-06-18T12:05:00.000Z",
    });

    expect(result).toEqual({
      accepted: false,
      reason: "Print job printer does not belong to job restaurant",
    });
  });

  it("rejects dispatch when ownership chain is invalid", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    seedPrinterResolution({ agentId: "agent-alpha" });
    mockPrinterForRestaurant(restaurantB);

    const result = await executePrintHostDispatch({ jobId: 100 });

    expect(result.status).toBe("failed");
    expect(result.failureReason).toMatch(/belongs to restaurant|does not match/i);
  });

  it("does not list agents via profile overlap when ownership differs", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    seedPrinterResolution({ agentId: "agent-alpha" });
    registerOnlineAgent("agent-foreign", restaurantB);
    seedPrinterResolution({ agentId: "agent-foreign" });

    const visibleAgentIds = listAgentConnectivityStates()
      .filter((state) => isAgentOwnedByRestaurant(state.agentId, restaurantA))
      .map((state) => state.agentId);

    expect(visibleAgentIds).toEqual(["agent-alpha"]);
  });

  it("assigns only within one ownership chain when printer and agent match restaurant", async () => {
    registerOnlineAgent("agent-alpha", restaurantA);
    seedPrinterResolution({ agentId: "agent-alpha" });

    const result = await assignPrintJob({ jobId: 100 });

    expect(result.assignment).toMatchObject({
      agentId: "agent-alpha",
      restaurantId: restaurantA,
      printerId: TEST_DB_PRINTER_ID,
    });
    expect(resolveRoutingDecision({
      jobId: 100,
      printerId: TEST_DB_PRINTER_ID,
      restaurantId: restaurantA,
    }).reason).toBe(ROUTING_REASONS.PRINTER_OWNER);
  });
});