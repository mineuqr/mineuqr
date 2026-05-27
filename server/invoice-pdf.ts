import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { SelectInvoice } from "../drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, "assets", "logo-mineuqr.jpeg");
const CAIRO_FONT = path.join(__dirname, "assets", "Cairo-Variable.ttf");

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  planName: string;
  amount: string;
  currency: string;
  issuedAt: string;
  status: string;
  paidAt?: string | null;
  billingCycle?: string;
}

/**
 * Clean text for PDF rendering - removes combining characters that crash fontkit
 */
function cleanTextForPDF(text: string): string {
  return text.replace(/[\u0300-\u036F]/g, "");
}

/**
 * Generate a professional PDF invoice with mineuqr branding
 * Uses Cairo font which supports both Arabic and Latin characters
 * Returns a Buffer containing the PDF data
 */
export async function generateInvoicePDFBuffer(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: "mineuqr",
          Subject: "Subscription Invoice",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Register Cairo font (supports Arabic + Latin)
      const hasCairoFont = fs.existsSync(CAIRO_FONT);
      if (hasCairoFont) {
        doc.registerFont("Cairo", CAIRO_FONT);
      }

      const pageWidth = doc.page.width - 100; // 50 margin each side

      // Use Cairo for all text if available, otherwise fallback to Helvetica
      const mainFont = hasCairoFont ? "Cairo" : "Helvetica";
      const boldFont = hasCairoFont ? "Cairo" : "Helvetica-Bold";

      // Clean customer name and plan name for PDF
      const customerName = cleanTextForPDF(data.customerName);
      const planName = cleanTextForPDF(data.planName);

      // ─── Header with Logo ───────────────────────────────────────
      if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 50, 40, { width: 60 });
      }

      doc
        .fontSize(24)
        .font(boldFont)
        .fillColor("#0d9488")
        .text("mineuqr", 120, 55, { align: "left" });

      doc
        .fontSize(9)
        .font(mainFont)
        .fillColor("#666666")
        .text("Digital Menu Platform", 120, 82);

      // Invoice title on the right
      doc
        .fontSize(28)
        .font(boldFont)
        .fillColor("#1a1a2e")
        .text("INVOICE", 0, 50, { align: "right" });

      doc
        .fontSize(10)
        .font(mainFont)
        .fillColor("#666666")
        .text(`#${data.invoiceNumber}`, 0, 82, { align: "right" });

      // ─── Divider ────────────────────────────────────────────────
      doc
        .moveTo(50, 115)
        .lineTo(50 + pageWidth, 115)
        .strokeColor("#0d9488")
        .lineWidth(2)
        .stroke();

      // ─── Invoice Details ────────────────────────────────────────
      const detailsY = 140;

      // Left column - Bill To
      doc
        .fontSize(10)
        .font(boldFont)
        .fillColor("#333333")
        .text("BILL TO:", 50, detailsY);

      doc
        .fontSize(11)
        .font(mainFont)
        .fillColor("#1a1a2e")
        .text(customerName, 50, detailsY + 18);

      // Right column - Invoice Info
      const rightCol = 350;
      doc
        .fontSize(10)
        .font(boldFont)
        .fillColor("#333333")
        .text("Invoice Date:", rightCol, detailsY);
      doc
        .font(mainFont)
        .text(formatDate(data.issuedAt), rightCol + 90, detailsY);

      doc
        .font(boldFont)
        .text("Status:", rightCol, detailsY + 20);

      const statusColor = data.status === "paid" ? "#16a34a" : data.status === "pending" ? "#f59e0b" : "#ef4444";
      doc
        .font(boldFont)
        .fillColor(statusColor)
        .text(getStatusLabel(data.status), rightCol + 90, detailsY + 20);

      if (data.paidAt) {
        doc
          .font(boldFont)
          .fillColor("#333333")
          .text("Paid On:", rightCol, detailsY + 40);
        doc
          .font(mainFont)
          .text(formatDate(data.paidAt), rightCol + 90, detailsY + 40);
      }

      // ─── Items Table ────────────────────────────────────────────
      const tableY = 230;

      // Table header
      doc
        .rect(50, tableY, pageWidth, 30)
        .fillColor("#0d9488")
        .fill();

      doc
        .fontSize(10)
        .font(boldFont)
        .fillColor("#ffffff")
        .text("Description", 60, tableY + 9)
        .text("Billing Cycle", 280, tableY + 9)
        .text("Amount", 430, tableY + 9, { align: "right", width: 80 });

      // Table row
      const rowY = tableY + 30;
      doc
        .rect(50, rowY, pageWidth, 35)
        .fillColor("#f8fafc")
        .fill();

      doc
        .fontSize(10)
        .font(mainFont)
        .fillColor("#1a1a2e")
        .text(`${planName} - Subscription`, 60, rowY + 11)
        .text(getBillingCycleLabel(data.billingCycle), 280, rowY + 11)
        .text(`${data.currency} ${parseFloat(data.amount).toFixed(2)}`, 430, rowY + 11, { align: "right", width: 80 });

      // ─── Total Section ──────────────────────────────────────────
      const totalY = rowY + 60;

      doc
        .moveTo(350, totalY)
        .lineTo(50 + pageWidth, totalY)
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(10)
        .font(mainFont)
        .fillColor("#666666")
        .text("Subtotal:", 350, totalY + 12)
        .text(`${data.currency} ${parseFloat(data.amount).toFixed(2)}`, 430, totalY + 12, { align: "right", width: 80 });

      doc
        .text("Tax (0%):", 350, totalY + 32)
        .text(`${data.currency} 0.00`, 430, totalY + 32, { align: "right", width: 80 });

      doc
        .moveTo(350, totalY + 55)
        .lineTo(50 + pageWidth, totalY + 55)
        .strokeColor("#0d9488")
        .lineWidth(2)
        .stroke();

      doc
        .fontSize(14)
        .font(boldFont)
        .fillColor("#0d9488")
        .text("TOTAL:", 350, totalY + 65)
        .text(`${data.currency} ${parseFloat(data.amount).toFixed(2)}`, 430, totalY + 65, { align: "right", width: 80 });

      // ─── Footer ─────────────────────────────────────────────────
      const footerY = 680;

      doc
        .moveTo(50, footerY)
        .lineTo(50 + pageWidth, footerY)
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .stroke();

      doc
        .fontSize(9)
        .font(mainFont)
        .fillColor("#999999")
        .text("Thank you for choosing mineuqr!", 50, footerY + 15, { align: "center", width: pageWidth })
        .text("www.mineuqr.com", 50, footerY + 30, { align: "center", width: pageWidth })
        .text(`Generated on ${new Date().toLocaleDateString("en-US")}`, 50, footerY + 45, { align: "center", width: pageWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Legacy function - generates PDF invoice (updated to use PDFKit)
 */
export async function generateInvoicePDF(
  invoice: SelectInvoice,
  companyName: string,
  companyEmail: string
): Promise<Buffer> {
  return generateInvoicePDFBuffer({
    invoiceNumber: invoice.invoiceNumber,
    customerName: companyName,
    planName: "Subscription",
    amount: invoice.amount,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt,
    status: invoice.status,
    paidAt: invoice.paidAt,
  });
}

// ─── Helper Functions ─────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    // TODO(TZ-6C): Avoid server-local date rendering for business documents.
    // Prefer `formatInRestaurantTimezone(..., timeZone)` (Riyadh baseline) so PDFs are deterministic
    // across environments and future multi-country support.
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "PENDING",
    paid: "PAID",
    failed: "FAILED",
    refunded: "REFUNDED",
  };
  return map[status] || status.toUpperCase();
}

function getBillingCycleLabel(cycle?: string): string {
  if (cycle === "yearly") return "Yearly";
  if (cycle === "monthly") return "Monthly";
  return "One-time";
}

/**
 * Generate invoice HTML for email or display
 */
export function generateInvoiceHTML(
  invoice: SelectInvoice,
  companyName: string,
  companyEmail: string
): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  };
  const statusText = statusMap[invoice.status] || invoice.status;
  // TODO(TZ-6C): Use explicit timezone-aware formatting for invoice and due dates.
  const invoiceDate = new Date(invoice.issuedAt).toLocaleDateString();
  const dueDate = new Date(invoice.dueAt).toLocaleDateString();
  const amount = parseFloat(invoice.amount).toFixed(2);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; color: #0d9488; margin-bottom: 10px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 5px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; margin-top: 15px; }
    .row { display: flex; margin-bottom: 8px; }
    .label { width: 40%; color: #666; }
    .value { width: 60%; font-weight: bold; }
    .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #0d9488; }
    .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
    .total-label { width: 40%; font-weight: bold; text-align: right; }
    .total-value { width: 20%; font-weight: bold; text-align: right; color: #0d9488; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">mineuqr - INVOICE</div>
      <div class="subtitle">Invoice #${invoice.invoiceNumber}</div>
      <div class="subtitle">${companyName}</div>
    </div>
    <div class="section">
      <div class="row"><div class="label">Invoice Date:</div><div class="value">${invoiceDate}</div></div>
      <div class="row"><div class="label">Due Date:</div><div class="value">${dueDate}</div></div>
      <div class="row"><div class="label">Status:</div><div class="value">${statusText}</div></div>
    </div>
    <div class="section">
      <div class="section-title">Amount</div>
      <div class="row"><div class="label">Subtotal:</div><div class="value">${invoice.currency} ${amount}</div></div>
      <div class="row"><div class="label">Tax:</div><div class="value">${invoice.currency} 0.00</div></div>
    </div>
    <div class="total-section">
      <div class="total-row"><div class="total-label">TOTAL:</div><div class="total-value">${invoice.currency} ${amount}</div></div>
    </div>
    ${invoice.status === "paid" && invoice.paidAt ? `
    <div class="section">
      <div class="section-title">Payment Information</div>
      <div class="row"><div class="label">Paid On:</div><div class="value">${new Date(invoice.paidAt).toLocaleDateString()}</div></div>
    </div>` : ""}
    <div class="footer">
      <p>Thank you for choosing mineuqr!</p>
      <p>www.mineuqr.com | ${companyEmail}</p>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`;
}
