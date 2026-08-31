/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Human-readable electronic invoice HTML from Phase 1 document snapshot.
 * No live Customer/Product/Profile reads. No browser URL/footer injection.
 */

import QRCode from "qrcode";
import type { SaudiPhase1Document } from "@shared/compliance";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function renderSaudiPhase1InvoiceHtml(
  document: SaudiPhase1Document
): Promise<string> {
  const buyerLabel =
    document.buyer.kind === "anonymous_cash"
      ? "عميل نقدي / Cash customer"
      : escapeHtml(document.buyer.displayName);
  const buyerVat =
    document.buyerVatNumberDisplayed != null
      ? `<div><strong>الرقم الضريبي للمشتري / Buyer VAT:</strong> ${escapeHtml(
          document.buyerVatNumberDisplayed
        )}</div>`
      : "";

  const lines = document.lines.orderLines
    .map((line) => {
      const name = escapeHtml(line.nameAr || line.nameEn || "");
      return `<tr>
        <td>${name}</td>
        <td class="num">${line.quantity}</td>
        <td class="num">${escapeHtml(line.unitPrice)}</td>
        <td class="num">${escapeHtml(line.lineAmount)}</td>
      </tr>`;
    })
    .join("");

  let qrBlock = "";
  if (document.qrRequired) {
    if (document.qrPayloadBase64) {
      const dataUrl = await QRCode.toDataURL(document.qrPayloadBase64, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 180,
      });
      qrBlock = `<div class="qr">
          <div class="qr-label">رمز الاستجابة السريعة / QR</div>
          <img alt="Phase 1 QR" src="${dataUrl}" width="180" height="180" />
        </div>`;
    } else {
      qrBlock = `<div class="qr missing">QR required but missing</div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.titles.ar)} — ${escapeHtml(
    document.invoiceNumber
  )}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #111; margin: 0; padding: 16px; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .sub { color: #444; margin-bottom: 16px; }
    .meta div { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: right; }
    th { background: #f7f7f7; }
    .num { text-align: left; font-variant-numeric: tabular-nums; }
    .totals { margin-top: 16px; }
    .qr { margin-top: 20px; text-align: center; page-break-inside: avoid; }
    .qr img { width: 180px; height: 180px; }
    @media print {
      a[href]::after { content: none !important; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(document.titles.ar)}</h1>
  <div class="sub">${escapeHtml(document.titles.en)}</div>
  <div class="meta">
    <div><strong>رقم الفاتورة / Invoice No:</strong> ${escapeHtml(
      document.invoiceNumber
    )}</div>
    <div><strong>تاريخ الإصدار / Issue:</strong> ${escapeHtml(
      document.issueTimestampIso
    )} (${document.timezone})</div>
    <div><strong>البائع / Seller:</strong> ${escapeHtml(
      document.seller.legalName ?? ""
    )}</div>
    <div><strong>الرقم الضريبي للبائع / Seller VAT:</strong> ${escapeHtml(
      document.seller.vatNumber ?? ""
    )}</div>
    <div><strong>عنوان البائع / Seller Address:</strong> ${escapeHtml(
      document.seller.registeredAddress ?? ""
    )}</div>
    <div><strong>المشتري / Buyer:</strong> ${buyerLabel}</div>
    ${buyerVat}
  </div>
  <table>
    <thead>
      <tr>
        <th>الصنف / Item</th>
        <th>الكمية / Qty</th>
        <th>السعر / Price</th>
        <th>المبلغ / Amount</th>
      </tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="totals">
    <div>المجموع الفرعي / Subtotal: ${escapeHtml(
      document.monetary.subtotal
    )} ${escapeHtml(document.monetary.currencyCode)}</div>
    <div>الخصم / Discount: ${escapeHtml(
      document.monetary.discountAmount
    )}</div>
    <div>ضريبة القيمة المضافة / VAT: ${escapeHtml(
      document.monetary.taxAmount
    )} <span style="font-size:11px;color:#666">(Collection Fact source)</span></div>
    <div><strong>الإجمالي / Total: ${escapeHtml(
      document.monetary.amount
    )} ${escapeHtml(document.monetary.currencyCode)}</strong></div>
  </div>
  ${qrBlock}
</body>
</html>`;
}
