import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRINT_JOB_STATUS } from "../../shared/printing/types";
import { clearAgentRegistry } from "./agentRegistry";
import { clearAgentRestaurantProjectionCache } from "./endpointRegistryCompatibility";
import { clearPrintJobAssignments } from "./assignmentService";
import { clearExecutionOutcomeStore } from "./executionOutcomeStore";
import { clearPrinterProfileStore } from "./printerProfileStore";
import { clearPrinterResolutionRegistry, registerDbPrinterProfileMapping } from "./printerResolutionRegistry";
import { registerOnlineAgent, seedPrinterProfile, TEST_DB_PRINTER_ID, TEST_PROFILE_PRINTER_ID } from "./printingTestHelpers";

const repoMocks = vi.hoisted(() => ({
  listPrintersForRestaurant: vi.fn(),
  listPrintJobsForRestaurant: vi.fn(),
  countPrintJobsByStatusForRestaurant: vi.fn(),
  findLatestPrintJobForPrinter: vi.fn(),
  findPrintJobById: vi.fn(),
}));

vi.mock("./stationRepository", () => ({
  listPrintStationsForRestaurant: vi.fn().mockResolvedValue([]),
  countPrintJobsByStationForRestaurant: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("./printerRepository", () => ({
  listPrintersForRestaurant: (...args: unknown[]) => repoMocks.listPrintersForRestaurant(...args),
  findPrinterById: vi.fn(),
  findRestaurantPrintSettings: vi.fn(),
  listAllPrinters: vi.fn(),
}));

vi.mock("./printJobRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./printJobRepository")>();
  return {
    ...actual,
    listPrintJobsForRestaurant: (...args: unknown[]) =>
      repoMocks.listPrintJobsForRestaurant(...args),
    countPrintJobsByStatusForRestaurant: (...args: unknown[]) =>
      repoMocks.countPrintJobsByStatusForRestaurant(...args),
    findLatestPrintJobForPrinter: (...args: unknown[]) =>
      repoMocks.findLatestPrintJobForPrinter(...args),
    findPrintJobById: (...args: unknown[]) => repoMocks.findPrintJobById(...args),
  };
});

import {
  getPrintJobDetail,
  getPrintOperationsSummary,
  listAgentOverview,
  listPrinterOverview,
} from "./printOperationsService";
import { assignPrintJob } from "./assignmentService";

const restaurantId = 720007;

describe("printOperationsService THERMAL-PRINTING-11C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentRegistry();
    clearAgentRestaurantProjectionCache();
    clearPrinterProfileStore();
    clearPrinterResolutionRegistry();
    clearPrintJobAssignments();
    clearExecutionOutcomeStore();

    repoMocks.listPrintersForRestaurant.mockResolvedValue([
      {
        id: TEST_DB_PRINTER_ID,
        restaurantId,
        name: "Kitchen",
        paperWidthMm: 80,
        profileId: TEST_PROFILE_PRINTER_ID,
        isDefault: true,
        createdAt: "2026-06-21 12:00:00",
        updatedAt: "2026-06-21 12:00:00",
      },
    ]);
    repoMocks.countPrintJobsByStatusForRestaurant.mockResolvedValue({
      [PRINT_JOB_STATUS.QUEUED]: 2,
      [PRINT_JOB_STATUS.PRINTED]: 5,
      [PRINT_JOB_STATUS.FAILED]: 1,
    });
    repoMocks.findLatestPrintJobForPrinter.mockResolvedValue({
      id: 100,
      restaurantId,
      orderId: 500,
      printerId: TEST_DB_PRINTER_ID,
      status: PRINT_JOB_STATUS.PRINTED,
      attemptCount: 1,
      idempotencyKey: "order:500:submitted",
      claimedBy: null,
      leaseExpiresAt: null,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:30:00",
    });
    repoMocks.listPrintJobsForRestaurant.mockResolvedValue({ jobs: [], total: 0 });
    repoMocks.findPrintJobById.mockResolvedValue(null);
  });

  it("returns operational summary metrics", async () => {
    registerOnlineAgent("agent-alpha", restaurantId);
    registerDbPrinterProfileMapping({
      dbPrinterId: TEST_DB_PRINTER_ID,
      profilePrinterId: TEST_PROFILE_PRINTER_ID,
    });
    seedPrinterProfile("agent-alpha");

    const summary = await getPrintOperationsSummary(restaurantId);

    expect(summary).toEqual({
      totalPrinters: 1,
      activePrinters: 1,
      inactivePrinters: 0,
      totalJobs: 8,
      successfulJobs: 5,
      failedJobs: 1,
      queuedJobs: 2,
    });
  });

  it("lists printer overview with profile and activity metadata", async () => {
    registerOnlineAgent("agent-alpha", restaurantId);
    registerDbPrinterProfileMapping({
      dbPrinterId: TEST_DB_PRINTER_ID,
      profilePrinterId: TEST_PROFILE_PRINTER_ID,
    });
    seedPrinterProfile("agent-alpha");

    const printers = await listPrinterOverview(restaurantId);

    expect(printers).toEqual([
      expect.objectContaining({
        id: TEST_DB_PRINTER_ID,
        profileId: TEST_PROFILE_PRINTER_ID,
        transport: "usb",
        isActive: true,
        isDefault: true,
        lastActivityAt: "2026-06-21 12:30:00",
      }),
    ]);
  });

  it("lists connected agents owned by the restaurant", async () => {
    registerOnlineAgent("agent-alpha", restaurantId);
    seedPrinterProfile("agent-alpha", TEST_PROFILE_PRINTER_ID);
    registerOnlineAgent("agent-other", 999);
    seedPrinterProfile("agent-other", TEST_PROFILE_PRINTER_ID);

    const agents = await listAgentOverview(restaurantId);

    expect(agents).toEqual([
      {
        agentId: "agent-alpha",
        status: "online",
        platform: "windows",
        connectedAt: expect.any(String),
        lastHeartbeatAt: expect.any(String),
        reportedProfileCount: 1,
      },
    ]);
  });

  it("returns print job detail with assignment metadata from database authority", async () => {
    registerOnlineAgent("agent-alpha", restaurantId);
    registerDbPrinterProfileMapping({
      dbPrinterId: TEST_DB_PRINTER_ID,
      profilePrinterId: TEST_PROFILE_PRINTER_ID,
    });
    seedPrinterProfile("agent-alpha");

    repoMocks.findPrintJobById.mockResolvedValue({
      id: 100,
      restaurantId,
      orderId: 500,
      printerId: TEST_DB_PRINTER_ID,
      stationId: null,
      assignedAgentId: "agent-alpha",
      assignedAt: "2026-06-21 12:00:00",
      status: PRINT_JOB_STATUS.ASSIGNED,
      attemptCount: 0,
      idempotencyKey: "order:500:submitted",
      claimedBy: null,
      leaseExpiresAt: null,
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:00:00",
    });

    const detail = await getPrintJobDetail(restaurantId, 100);

    expect(detail).toMatchObject({
      id: 100,
      orderId: 500,
      operationalStatus: "assigned",
      dbStatus: PRINT_JOB_STATUS.ASSIGNED,
      assignedAgentId: "agent-alpha",
      assignment: {
        agentId: "agent-alpha",
        printerId: TEST_DB_PRINTER_ID,
      },
    });
  });
});
