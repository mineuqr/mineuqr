/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Phase 1 QR TLV encoding — tags 1–5 only (Generation Phase).
 *
 * Official source:
 * https://zatca.gov.sa/en/E-Invoicing/SystemsDevelopers/Documents/QRCodeCreation.pdf
 *
 * Tags 6–9 (hash / ECDSA / CSID stamp) are Phase 2 and MUST NOT be included.
 */

export const SAUDI_PHASE1_QR_TAGS = {
  SELLER_NAME: 1,
  SELLER_VAT_NUMBER: 2,
  TIMESTAMP: 3,
  INVOICE_TOTAL_WITH_VAT: 4,
  VAT_TOTAL: 5,
} as const;

export type SaudiPhase1QrFields = Readonly<{
  sellerName: string;
  sellerVatNumber: string;
  /** ISO-8601 timestamp as required by ZATCA QR examples. */
  timestampIso: string;
  invoiceTotalWithVat: string;
  vatTotal: string;
}>;

function encodeTlvTag(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  if (valueBytes.length > 255) {
    throw new Error(`Phase 1 QR TLV value for tag ${tag} exceeds 255 bytes`);
  }
  const out = new Uint8Array(2 + valueBytes.length);
  out[0] = tag & 0xff;
  out[1] = valueBytes.length & 0xff;
  out.set(valueBytes, 2);
  return out;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Build Base64 TLV QR payload for Phase 1 (tags 1–5 only).
 */
export function buildSaudiPhase1QrPayloadBase64(
  fields: SaudiPhase1QrFields
): string {
  const sellerName = fields.sellerName.trim();
  const sellerVatNumber = fields.sellerVatNumber.trim();
  const timestampIso = fields.timestampIso.trim();
  const invoiceTotalWithVat = fields.invoiceTotalWithVat.trim();
  const vatTotal = fields.vatTotal.trim();

  if (!sellerName) throw new Error("Phase 1 QR requires seller name (tag 1)");
  if (!sellerVatNumber) {
    throw new Error("Phase 1 QR requires seller VAT number (tag 2)");
  }
  if (!timestampIso) throw new Error("Phase 1 QR requires timestamp (tag 3)");
  if (!invoiceTotalWithVat) {
    throw new Error("Phase 1 QR requires invoice total with VAT (tag 4)");
  }
  if (!vatTotal) throw new Error("Phase 1 QR requires VAT total (tag 5)");

  const tlv = concatBytes([
    encodeTlvTag(SAUDI_PHASE1_QR_TAGS.SELLER_NAME, sellerName),
    encodeTlvTag(SAUDI_PHASE1_QR_TAGS.SELLER_VAT_NUMBER, sellerVatNumber),
    encodeTlvTag(SAUDI_PHASE1_QR_TAGS.TIMESTAMP, timestampIso),
    encodeTlvTag(SAUDI_PHASE1_QR_TAGS.INVOICE_TOTAL_WITH_VAT, invoiceTotalWithVat),
    encodeTlvTag(SAUDI_PHASE1_QR_TAGS.VAT_TOTAL, vatTotal),
  ]);

  return Buffer.from(tlv).toString("base64");
}

/** Decode Phase 1 tags for tests/validation. Rejects Phase 2-only tags 6–9. */
export function decodeSaudiPhase1QrPayloadBase64(
  payloadBase64: string
): ReadonlyArray<{ tag: number; value: string }> {
  const bytes = Buffer.from(payloadBase64, "base64");
  const tags: Array<{ tag: number; value: string }> = [];
  let i = 0;
  while (i < bytes.length) {
    if (i + 2 > bytes.length) throw new Error("Truncated Phase 1 QR TLV");
    const tag = bytes[i]!;
    const length = bytes[i + 1]!;
    i += 2;
    if (i + length > bytes.length) throw new Error("Truncated Phase 1 QR TLV value");
    if (tag >= 6) {
      throw new Error(`Phase 2 QR tag ${tag} is not allowed in Phase 1 payload`);
    }
    const value = new TextDecoder().decode(bytes.subarray(i, i + length));
    tags.push({ tag, value });
    i += length;
  }
  return tags;
}
