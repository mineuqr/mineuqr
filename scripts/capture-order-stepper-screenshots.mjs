import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const token = "demo-stepper-pr-cux-1b-polish";
const slug = "demo-restaurant";
const baseStatus = {
  orderNumber: "ORD-0042",
  createdAt: new Date().toISOString(),
  tableNumber: 7,
  itemCount: 3,
  totalAmount: "128.50",
  restaurantName: "مطعم التجربة",
  restaurantNameEn: "Demo Restaurant",
  currencySymbol: "ر.س",
  tableLabel: "tables",
};

const states = ["pending", "preparing", "ready", "served", "cancelled"];
const outDir = path.resolve("docs/pr-cux-1b-polish-1");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let currentStatus = "pending";
await page.route("**/api/trpc/order.getPublicStatus**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      {
        result: {
          data: {
            json: { ...baseStatus, status: currentStatus },
          },
        },
      },
    ]),
  });
});

for (const status of states) {
  currentStatus = status;
  await page.goto(`http://localhost:3000/menu/${slug}/order/${token}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(1200);
  const outPath = path.join(outDir, `stepper-${status}-ar.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log("Saved", outPath);
}

await browser.close();
