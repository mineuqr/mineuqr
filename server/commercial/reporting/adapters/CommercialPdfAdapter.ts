import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CommercialExportPackage } from "../reportContracts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CAIRO_FONT = path.join(__dirname, "..", "..", "..", "assets", "Cairo-Variable.ttf");

export type PdfAdapterOptions = {
  locale?: "en" | "ar";
};

function addLine(doc: InstanceType<typeof PDFDocument>, label: string, value: string | number) {
  doc.fontSize(10).text(`${label}: ${value}`, { continued: false });
}

/** Presentation-only — no metric derivation. */
export async function renderCommercialPdf(
  pkg: CommercialExportPackage,
  _options: PdfAdapterOptions = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: pkg.envelope.reportName,
          Author: "mineuqr",
          Subject: "Commercial Overview Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const hasCairoFont = fs.existsSync(CAIRO_FONT);
      const mainFont = hasCairoFont ? "Cairo" : "Helvetica";
      const boldFont = hasCairoFont ? "Cairo" : "Helvetica-Bold";
      if (hasCairoFont) doc.registerFont("Cairo", CAIRO_FONT);

      doc.font(boldFont).fontSize(18).fillColor("#0d9488").text(pkg.envelope.reportName);
      doc.moveDown(0.5);
      doc.font(mainFont).fontSize(10).fillColor("#111827");
      addLine(doc, "Report Version", pkg.envelope.reportVersion);
      addLine(doc, "Generated At", pkg.envelope.generatedAt);
      addLine(doc, "Data As Of", pkg.envelope.dataAsOf);
      addLine(doc, "Authority Source", pkg.envelope.authority.source);
      addLine(doc, "Metrics Source", pkg.envelope.authority.metricsSource);
      addLine(doc, "Definitions", pkg.envelope.definitionsRef);

      doc.moveDown();
      doc.font(boldFont).fontSize(14).text("Executive Summary");
      doc.font(mainFont).fontSize(10);
      const exec = pkg.overviewReport.executive;
      addLine(doc, "MRR (USD)", exec.mrr);
      addLine(doc, "ARR (USD)", exec.arr);
      addLine(doc, "Commercial Subscribers", exec.commercialSubscribers);
      addLine(doc, "Active Subscriptions", exec.activeSubscriptions);
      addLine(doc, "Active Trials", exec.activeTrials);
      addLine(doc, "Active Restaurants", exec.activeRestaurants);
      addLine(doc, "Total Users", exec.totalUsers);

      doc.moveDown();
      doc.font(boldFont).fontSize(14).text("Subscription Health");
      doc.font(mainFont).fontSize(10);
      const health = pkg.overviewReport.subscriptionHealth;
      addLine(doc, "Active", health.active);
      addLine(doc, "Trial", health.trial);
      addLine(doc, "Canceled", health.canceled);
      addLine(doc, "Expired", health.expired);
      addLine(doc, "Inactive", health.inactive);

      doc.moveDown();
      doc.font(boldFont).fontSize(14).text("Needs Attention");
      doc.font(mainFont).fontSize(10);
      const attention = pkg.overviewReport.needsAttention;
      addLine(doc, "Expiring Within 30 Days", attention.expiringWithin30Days);
      addLine(doc, "Canceled Accounts", attention.canceledAccounts);
      addLine(doc, "Expired Accounts", attention.expiredAccounts);

      doc.moveDown();
      doc.font(boldFont).fontSize(14).text("Plan Distribution");
      doc.font(mainFont).fontSize(10);
      for (const entry of pkg.overviewReport.planDistribution.entries) {
        addLine(doc, entry.planCode, entry.ownerCount);
      }

      doc.moveDown();
      doc.font(boldFont).fontSize(14).text("Operational Summary");
      doc.font(mainFont).fontSize(10);
      const counts = pkg.operationalReport.counts;
      addLine(doc, "Total Restaurants", counts.totalRestaurants);
      addLine(doc, "Active Restaurants", counts.activeRestaurants);
      addLine(doc, "Total Menu Items", counts.totalMenuItems);

      doc.moveDown(2);
      doc.fontSize(8).fillColor("#6b7280").text(
        `Fingerprint: ${pkg.snapshotFingerprint.slice(0, 16)}…`,
        { align: "left" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function commercialPdfFilename(asOf: string): string {
  const day = asOf.slice(0, 10);
  return `commercial-overview-${day}.pdf`;
}
