import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const token = "demo-tracking-token-pr-cux-1a";
const slug = "demo-restaurant";
const snapshot = {
  orderId: 1,
  orderNumber: "ORD-0042",
  trackingToken: token,
  tableNumber: 7,
  totalAmount: "128.50",
  itemCount: 3,
  createdAt: new Date().toISOString(),
  status: "pending",
  currencySymbol: "ر.س",
  restaurantName: "مطعم التجربة",
  tableLabel: "tables",
  customerName: "أحمد",
  items: [
    { nameAr: "برجر كلاسيك", nameEn: "Classic Burger", price: "45.00", quantity: 2 },
    { nameAr: "عصير برتقال", nameEn: "Orange Juice", price: "38.50", quantity: 1 },
  ],
};

const outDir = path.resolve("docs/pr-cux-1a");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.addInitScript(
  ({ key, value }) => {
    sessionStorage.setItem(key, value);
  },
  {
    key: `mineuqr:order-confirmation:${token}`,
    value: JSON.stringify(snapshot),
  }
);

await page.goto(`http://localhost:3000/menu/${slug}/order/${token}/confirmed`, {
  waitUntil: "networkidle",
  timeout: 60000,
});

await page.waitForTimeout(1500);

const enPath = path.join(outDir, "order-confirmation-en.png");
await page.screenshot({ path: enPath, fullPage: true });

await page.click("button:has-text('Track Order'), button:has-text('تتبع الطلب')").catch(() => {});

const placeholderPath = path.join(outDir, "order-status-placeholder.png");
await page.goto(`http://localhost:3000/menu/${slug}/order/${token}`, {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(1000);
await page.screenshot({ path: placeholderPath, fullPage: true });

await browser.close();
console.log("Screenshots saved:", enPath, placeholderPath);
