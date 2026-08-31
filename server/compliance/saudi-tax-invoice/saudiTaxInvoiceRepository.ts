/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Persistence for saudi_tax_invoices. Tenant-scoped. Insert/idempotent upgrade only.
 * Does not mutate Collection Fact / PAID / Payment / Settlement.
 */

import { and, eq } from "drizzle-orm";
import {
  saudiTaxInvoices,
  type InsertSaudiTaxInvoice,
  type SelectSaudiTaxInvoice,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import type {
  SaudiTaxInvoice,
  SaudiTaxInvoiceBuyerSnapshot,
  SaudiTaxInvoiceClassification,
  SaudiTaxInvoiceDocumentKind,
  SaudiTaxInvoiceForm,
  SaudiTaxInvoiceLinesSnapshot,
  SaudiTaxInvoiceMonetarySnapshot,
  SaudiTaxInvoicePartyModel,
  SaudiTaxInvoicePaymentSnapshot,
  SaudiTaxInvoiceSellerSnapshot,
  SaudiTaxInvoiceStatus,
} from "@shared/compliance";

function asObject<T>(value: unknown): T {
  return value as T;
}

function mapRow(row: SelectSaudiTaxInvoice): SaudiTaxInvoice {
  return {
    id: row.id,
    taxInvoiceId: row.taxInvoiceId,
    restaurantId: row.restaurantId,
    orderId: row.orderId,
    collectionFactId: row.collectionFactId,
    documentKind: row.documentKind as SaudiTaxInvoiceDocumentKind,
    status: row.status as SaudiTaxInvoiceStatus,
    partyModel: row.partyModel as SaudiTaxInvoicePartyModel,
    invoiceForm: row.invoiceForm as SaudiTaxInvoiceForm,
    classificationRationaleCode: row.classificationRationaleCode,
    classification: asObject<SaudiTaxInvoiceClassification>(row.classificationJson),
    sellerSnapshot: asObject<SaudiTaxInvoiceSellerSnapshot>(row.sellerSnapshotJson),
    buyerSnapshot: asObject<SaudiTaxInvoiceBuyerSnapshot>(row.buyerSnapshotJson),
    linesSnapshot: asObject<SaudiTaxInvoiceLinesSnapshot>(row.linesSnapshotJson),
    monetarySnapshot: asObject<SaudiTaxInvoiceMonetarySnapshot>(
      row.monetarySnapshotJson
    ),
    paymentSnapshot: asObject<SaudiTaxInvoicePaymentSnapshot>(
      row.paymentSnapshotJson
    ),
    sourceCustomerId: row.sourceCustomerId ?? null,
    profileReadinessAtIssuance: row.profileReadinessAtIssuance ?? null,
    failureCode: row.failureCode ?? null,
    failureMessage: row.failureMessage ?? null,
    attemptCount: row.attemptCount,
    issuedAt: row.issuedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function findSaudiTaxInvoiceByIdempotency(input: {
  restaurantId: number;
  collectionFactId: string;
  documentKind?: SaudiTaxInvoiceDocumentKind;
}): Promise<SaudiTaxInvoice | null> {
  const db = await getDb();
  if (!db) return null;
  const documentKind = input.documentKind ?? "tax_invoice";
  const [row] = await db
    .select()
    .from(saudiTaxInvoices)
    .where(
      and(
        eq(saudiTaxInvoices.restaurantId, input.restaurantId),
        eq(saudiTaxInvoices.collectionFactId, input.collectionFactId),
        eq(saudiTaxInvoices.documentKind, documentKind)
      )
    )
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function findSaudiTaxInvoiceByTaxInvoiceId(input: {
  restaurantId: number;
  taxInvoiceId: string;
}): Promise<SaudiTaxInvoice | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(saudiTaxInvoices)
    .where(
      and(
        eq(saudiTaxInvoices.restaurantId, input.restaurantId),
        eq(saudiTaxInvoices.taxInvoiceId, input.taxInvoiceId)
      )
    )
    .limit(1);
  return row ? mapRow(row) : null;
}

export type InsertSaudiTaxInvoiceRow = Omit<
  InsertSaudiTaxInvoice,
  "id" | "createdAt" | "updatedAt"
>;

export async function insertSaudiTaxInvoiceRow(
  data: InsertSaudiTaxInvoiceRow
): Promise<SaudiTaxInvoice> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(saudiTaxInvoices).values(data);
  const created = await findSaudiTaxInvoiceByIdempotency({
    restaurantId: data.restaurantId,
    collectionFactId: data.collectionFactId,
    documentKind: data.documentKind as SaudiTaxInvoiceDocumentKind,
  });
  if (!created) throw new Error("Saudi Tax Invoice insert failed");
  return created;
}

export type UpgradeSaudiTaxInvoiceSnapshotsInput = Readonly<{
  restaurantId: number;
  taxInvoiceId: string;
  status: SaudiTaxInvoiceStatus;
  partyModel: SaudiTaxInvoicePartyModel;
  invoiceForm: SaudiTaxInvoiceForm;
  classificationRationaleCode: string;
  classificationJson: SaudiTaxInvoiceClassification;
  sellerSnapshotJson: SaudiTaxInvoiceSellerSnapshot;
  buyerSnapshotJson: SaudiTaxInvoiceBuyerSnapshot;
  linesSnapshotJson: SaudiTaxInvoiceLinesSnapshot;
  monetarySnapshotJson: SaudiTaxInvoiceMonetarySnapshot;
  paymentSnapshotJson: SaudiTaxInvoicePaymentSnapshot;
  sourceCustomerId: number | null;
  profileReadinessAtIssuance: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  issuedAt: string | null;
}>;

/**
 * Allowed only for non-generated → generated (or blocked/retryable refresh).
 * Callers must enforce immutability of generated snapshots.
 */
export async function upgradeSaudiTaxInvoiceRow(
  input: UpgradeSaudiTaxInvoiceSnapshotsInput
): Promise<SaudiTaxInvoice> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(saudiTaxInvoices)
    .set({
      status: input.status,
      partyModel: input.partyModel,
      invoiceForm: input.invoiceForm,
      classificationRationaleCode: input.classificationRationaleCode,
      classificationJson: input.classificationJson,
      sellerSnapshotJson: input.sellerSnapshotJson,
      buyerSnapshotJson: input.buyerSnapshotJson,
      linesSnapshotJson: input.linesSnapshotJson,
      monetarySnapshotJson: input.monetarySnapshotJson,
      paymentSnapshotJson: input.paymentSnapshotJson,
      sourceCustomerId: input.sourceCustomerId,
      profileReadinessAtIssuance: input.profileReadinessAtIssuance,
      failureCode: input.failureCode,
      failureMessage: input.failureMessage,
      attemptCount: input.attemptCount,
      issuedAt: input.issuedAt,
    })
    .where(
      and(
        eq(saudiTaxInvoices.restaurantId, input.restaurantId),
        eq(saudiTaxInvoices.taxInvoiceId, input.taxInvoiceId)
      )
    );
  const updated = await findSaudiTaxInvoiceByTaxInvoiceId({
    restaurantId: input.restaurantId,
    taxInvoiceId: input.taxInvoiceId,
  });
  if (!updated) throw new Error("Saudi Tax Invoice upgrade failed");
  return updated;
}
