/**
 * THERMAL-PRINTING-11C — capture Printer Operations UI screenshots (mocked tRPC).
 * Prerequisite: `pnpm dev` on http://localhost:3000
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const restaurantId = 720007;
const outDir = path.resolve("docs/thermal-printing-11c");
await mkdir(outDir, { recursive: true });

const mockUser = {
  id: 1,
  name: "Demo Operator",
  email: "demo@mineuqr.test",
  role: "user",
  openId: "demo-open-id",
};

const mockRestaurant = {
  id: restaurantId,
  name: "Demo Restaurant",
  nameEn: "Demo Restaurant",
  slug: "demo-restaurant",
  currencySymbol: "SAR",
  tableLabel: "tables",
};

const mockSummary = {
  totalPrinters: 1,
  activePrinters: 1,
  inactivePrinters: 0,
  totalJobs: 12,
  successfulJobs: 8,
  failedJobs: 1,
  queuedJobs: 2,
};

const mockPrinters = [
  {
    id: 1,
    name: "Kitchen POS-80C",
    profileId: "pos-80c-copy-1-usb001",
    transport: "usb",
    isActive: true,
    isDefault: true,
    lastActivityAt: "2026-06-21 12:30:00",
  },
];

const mockJobs = {
  jobs: [
    {
      id: 180001,
      orderId: 3810002,
      printerId: 1,
      dbStatus: "printed",
      operationalStatus: "delivered",
      createdAt: "2026-06-21 12:00:00",
      updatedAt: "2026-06-21 12:05:00",
      assignedAgentId: "agent-alpha",
    },
    {
      id: 150002,
      orderId: 3810178,
      printerId: null,
      dbStatus: "queued",
      operationalStatus: "queued",
      createdAt: "2026-06-20 18:00:00",
      updatedAt: "2026-06-20 18:00:00",
      assignedAgentId: null,
    },
  ],
  total: 2,
  limit: 15,
  offset: 0,
};

const mockPrinterDetail = {
  found: true,
  printer: {
    ...mockPrinters[0],
    paperWidthMm: 80,
    resolution: { status: "resolved", agentId: "agent-alpha", profilePrinterId: "pos-80c-copy-1-usb001" },
    recentJobs: mockJobs.jobs.slice(0, 1),
  },
};

const mockJobDetail = {
  found: true,
  job: {
    ...mockJobs.jobs[0],
    idempotencyKey: "order:3810002:submitted",
    attemptCount: 1,
    assignment: {
      agentId: "agent-alpha",
      assignedAt: "2026-06-21 12:01:00",
      printerId: 1,
    },
    routing: { agentId: "agent-alpha", reason: "default-printer" },
    executionOutcome: {
      outcomeStatus: "executed",
      category: "success",
      transport: "usb",
      message: "Printed via Windows spooler",
      timestamp: "2026-06-21 12:04:00",
    },
    deliveryState: { state: "delivered", acknowledgedAt: "2026-06-21 12:05:00" },
    protocolStatus: { state: "completed", timestamp: "2026-06-21 12:04:30" },
  },
};

const mockFailures = [
  {
    jobId: 150002,
    orderId: 3810178,
    printerId: null,
    failureLayer: "assignment",
    failureCode: "missing-printer-target",
    failureMessage: "Print job has no printer target",
    timestamp: "2026-06-20 18:00:05",
  },
];

function trpcJson(data) {
  return JSON.stringify([{ result: { data: { json: data } } }]);
}

function matchProcedure(url, name) {
  return url.includes(name);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.route("**/api/trpc/**", async (route) => {
  const url = route.request().url();
  let body = trpcJson(null);

  if (matchProcedure(url, "auth.me")) body = trpcJson(mockUser);
  else if (matchProcedure(url, "restaurant.getById")) body = trpcJson(mockRestaurant);
  else if (matchProcedure(url, "restaurant.list")) body = trpcJson([mockRestaurant]);
  else if (matchProcedure(url, "printOps.getSummary")) body = trpcJson(mockSummary);
  else if (matchProcedure(url, "printOps.listPrinters")) body = trpcJson(mockPrinters);
  else if (matchProcedure(url, "printOps.listPrintJobs")) body = trpcJson(mockJobs);
  else if (matchProcedure(url, "printOps.getPrinter")) body = trpcJson(mockPrinterDetail);
  else if (matchProcedure(url, "printOps.getPrintJob")) body = trpcJson(mockJobDetail);
  else if (matchProcedure(url, "printOps.listFailures")) body = trpcJson(mockFailures);

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body,
  });
});

const dashboardUrl = `http://localhost:3000/dashboard?restaurant=${restaurantId}&section=printing`;
await page.goto(dashboardUrl, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector("text=Kitchen POS-80C", { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

const printerListPath = path.join(outDir, "printer-list.png");
await page.screenshot({ path: printerListPath, fullPage: true });

await page.getByRole("row", { name: /Kitchen POS-80C/i }).click();
await page.waitForTimeout(1000);
const printerDetailPath = path.join(outDir, "printer-details.png");
await page.screenshot({ path: printerDetailPath, fullPage: true });
await page.keyboard.press("Escape");
await page.waitForTimeout(500);

await page.getByRole("tab", { name: /Print Queue|قائمة الطباعة/i }).click();
await page.waitForTimeout(1000);
const queuePath = path.join(outDir, "print-queue.png");
await page.screenshot({ path: queuePath, fullPage: true });

await page.getByRole("row", { name: /180001/i }).click();
await page.waitForTimeout(1000);
const jobDetailPath = path.join(outDir, "print-job-details.png");
await page.screenshot({ path: jobDetailPath, fullPage: true });

await browser.close();
console.log("Screenshots saved to", outDir);
console.log(printerListPath, printerDetailPath, queuePath, jobDetailPath);
