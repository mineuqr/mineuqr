import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const token = "demo-tracking-token-pr-cux-1b";
const slug = "demo-restaurant";
const mockStatus = {
  orderNumber: "ORD-0042",
  createdAt: new Date().toISOString(),
  tableNumber: 7,
  itemCount: 3,
  totalAmount: "128.50",
  status: "preparing",
  restaurantName: "مطعم التجربة",
  restaurantNameEn: "Demo Restaurant",
  currencySymbol: "ر.س",
  tableLabel: "tables",
};

const outDir = path.resolve("docs/pr-cux-1b");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.route("**/api/trpc/order.getPublicStatus**", async (route) => {
  const body = JSON.stringify([
    {
      result: {
        data: {
          json: mockStatus,
        },
      },
    },
  ]);
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body,
  });
});

await page.goto(`http://localhost:3000/menu/${slug}/order/${token}`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(1500);

const statusPath = path.join(outDir, "order-status-preparing.png");
await page.screenshot({ path: statusPath, fullPage: true });

mockStatus.status = "cancelled";
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const cancelledPath = path.join(outDir, "order-status-cancelled.png");
await page.screenshot({ path: cancelledPath, fullPage: true });

await browser.close();
console.log("Screenshots saved:", statusPath, cancelledPath);
