/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Saudi Compliance Tax Invoice ensure path — post Collection Fact only.
 * Does not mutate Collection Fact, PAID, Payment, or Settlement.
 */

import { randomUUID } from "node:crypto";
import {
  classifySaudiTaxInvoiceFoundation,
  evaluateSaudiTaxProfileReadiness,
  isSaudiTaxInvoiceSnapshotImmutable,
  assertSaudiTaxInvoiceStatusTransition,
  type EnsureSaudiTaxInvoiceInput,
  type EnsureSaudiTaxInvoiceResult,
  type SaudiTaxInvoice,
  type SaudiTaxInvoiceStatus,
} from "@shared/compliance";
import { findCollectionFactByFactId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import { findSaudiTaxProfileByRestaurantId } from "../saudi-tax-profile/saudiTaxProfileRepository";
import { findCustomerById } from "../../customer/customerRepository";
import { getOrderById, getOrderItemsByOrderId } from "../../db";
import {
  findSaudiTaxInvoiceByIdempotency,
  findSaudiTaxInvoiceByTaxInvoiceId,
  insertSaudiTaxInvoiceRow,
  upgradeSaudiTaxInvoiceRow,
} from "./saudiTaxInvoiceRepository";
import { applySaudiPhase1Generation } from "./saudiPhase1GenerationService";
import {
  buildBuyerSnapshot,
  buildLinesSnapshot,
  buildMonetarySnapshot,
  buildPaymentSnapshot,
  buildSellerSnapshot,
} from "./saudiTaxInvoiceSnapshotBuilder";
import { runSaudiTaxInvoiceEnsureSingleFlight } from "./saudiTaxInvoiceEnsureSingleFlight";

function buildTaxInvoiceId(): string {
  return `sti_${randomUUID()}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string | number }).code;
  const errno = (error as { errno?: number }).errno;
  const message = String((error as { message?: string }).message ?? "");
  return (
    code === "ER_DUP_ENTRY" ||
    code === 1062 ||
    errno === 1062 ||
    message.includes("Duplicate entry") ||
    message.includes("saudi_tax_invoices_idempotency_unique")
  );
}

async function loadIssuanceContext(input: EnsureSaudiTaxInvoiceInput) {
  if (input.countryCode !== "SA") {
    throw new Error("Saudi Tax Invoice domain is SA-only");
  }

  // CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 — independent reads in parallel.
  const [collectionFact, order, profile] = await Promise.all([
    findCollectionFactByFactId({
      restaurantId: input.restaurantId,
      collectionFactId: input.collectionFactId,
    }),
    getOrderById(input.orderId),
    findSaudiTaxProfileByRestaurantId(input.restaurantId),
  ]);

  if (!collectionFact) {
    throw new Error(
      `Collection Fact not found for Tax Invoice: ${input.collectionFactId}`
    );
  }
  if (collectionFact.orderId !== input.orderId) {
    throw new Error("Collection Fact orderId mismatch for Tax Invoice");
  }
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new Error(
      `Sale/order not found or cross-tenant for Tax Invoice: ${input.orderId}`
    );
  }

  const { readiness } = evaluateSaudiTaxProfileReadiness(profile);

  const [orderItems, customer] = await Promise.all([
    getOrderItemsByOrderId(input.orderId),
    order.customerId != null
      ? findCustomerById(input.restaurantId, order.customerId)
      : Promise.resolve(null),
  ]);

  const classification = classifySaudiTaxInvoiceFoundation({
    buyerPresence: customer ? "present" : "absent",
    customerType: customer?.customerType ?? null,
    taxNumberPresent: Boolean(customer?.taxNumber?.trim()),
  });

  const sellerSnapshot = buildSellerSnapshot({ profile, readiness });
  const buyerSnapshot = buildBuyerSnapshot({ customer });
  const linesSnapshot = buildLinesSnapshot({
    orderItems: orderItems.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? null,
      price: String(item.price),
      quantity: item.quantity,
      notes: item.notes ?? null,
      modifiers: (item.modifiers as string[] | null) ?? null,
    })),
    collectionFact,
  });
  const monetarySnapshot = buildMonetarySnapshot(collectionFact);
  const paymentSnapshot = buildPaymentSnapshot(collectionFact);

  const sellerVatPresent = Boolean(profile?.vatNumber?.trim());
  let status: SaudiTaxInvoiceStatus;
  if (readiness !== "READY") {
    status = "blocked_profile";
  } else if (!sellerVatPresent) {
    // Official Phase 1 QR tag 2 requires seller VAT number.
    status = "retryable";
  } else {
    status = "generated";
  }

  return {
    status,
    readiness,
    classification,
    sellerSnapshot,
    buyerSnapshot,
    linesSnapshot,
    monetarySnapshot,
    paymentSnapshot,
    sourceCustomerId: customer?.id ?? null,
    orderId: order.id,
    sellerVatPresent,
  };
}

function toPersistFields(
  ctx: Awaited<ReturnType<typeof loadIssuanceContext>>,
  attemptCount: number
) {
  const issuedAt =
    ctx.status === "generated"
      ? new Date().toISOString().slice(0, 19).replace("T", " ")
      : null;

  let failureCode: string | null = null;
  let failureMessage: string | null = null;
  if (ctx.status === "blocked_profile") {
    failureCode = "PROFILE_NOT_READY";
    failureMessage = `Saudi Tax Profile readiness is ${ctx.readiness}; Tax Invoice generation blocked (PAID unchanged).`;
  } else if (ctx.status === "retryable" && !ctx.sellerVatPresent) {
    failureCode = "PHASE1_SELLER_VAT_MISSING";
    failureMessage =
      "Phase 1 generation blocked: seller VAT number required for Phase 1 QR/invoice fields (OQ-SELLER-1 / PAID unchanged).";
  }

  return {
    status: ctx.status,
    partyModel: ctx.classification.partyModel,
    invoiceForm: ctx.classification.invoiceForm,
    classificationRationaleCode: ctx.classification.rationaleCode,
    classificationJson: ctx.classification,
    sellerSnapshotJson: ctx.sellerSnapshot,
    buyerSnapshotJson: ctx.buyerSnapshot,
    linesSnapshotJson: ctx.linesSnapshot,
    monetarySnapshotJson: ctx.monetarySnapshot,
    paymentSnapshotJson: ctx.paymentSnapshot,
    sourceCustomerId: ctx.sourceCustomerId,
    profileReadinessAtIssuance: ctx.readiness,
    failureCode,
    failureMessage,
    attemptCount,
    issuedAt,
  };
}

/**
 * Idempotent ensure: same restaurant + collectionFactId + documentKind → one aggregate.
 * Phase 1 generation runs after domain snapshot when status allows.
 * CASHIER-TAX-INVOICE-PREPARING-STATE-LATENCY-1 — single-flight per collectionFactId
 * collapses concurrent background + Cashier read-path ensure on one isolate.
 */
export async function ensureSaudiTaxInvoiceForCollectionFact(
  input: EnsureSaudiTaxInvoiceInput
): Promise<EnsureSaudiTaxInvoiceResult> {
  const flightKey = `${input.restaurantId}:${input.collectionFactId}:tax_invoice`;
  return runSaudiTaxInvoiceEnsureSingleFlight(flightKey, () =>
    ensureSaudiTaxInvoiceForCollectionFactUnlogged(input)
  );
}

async function ensureSaudiTaxInvoiceForCollectionFactUnlogged(
  input: EnsureSaudiTaxInvoiceInput
): Promise<EnsureSaudiTaxInvoiceResult> {
  const existing = await findSaudiTaxInvoiceByIdempotency({
    restaurantId: input.restaurantId,
    collectionFactId: input.collectionFactId,
    documentKind: "tax_invoice",
  });

  // Immutable replay: skip re-loading issuance context (Customer evaluation + latency).
  if (existing && isSaudiTaxInvoiceSnapshotImmutable(existing.status)) {
    let taxInvoice = existing;
    if (
      taxInvoice.status === "generated" ||
      taxInvoice.status === "retryable"
    ) {
      taxInvoice = await applySaudiPhase1Generation(taxInvoice);
    }
    return { outcome: "replayed", taxInvoice };
  }

  const ctx = await loadIssuanceContext(input);

  let outcome: EnsureSaudiTaxInvoiceResult["outcome"];
  let taxInvoice: SaudiTaxInvoice;

  if (existing) {
    assertSaudiTaxInvoiceStatusTransition(existing.status, ctx.status);
    const fields = toPersistFields(ctx, existing.attemptCount + 1);
    taxInvoice = await upgradeSaudiTaxInvoiceRow({
      restaurantId: input.restaurantId,
      taxInvoiceId: existing.taxInvoiceId,
      ...fields,
    });
    outcome = "upgraded";
  } else {
    const fields = toPersistFields(ctx, 1);
    try {
      taxInvoice = await insertSaudiTaxInvoiceRow({
        taxInvoiceId: buildTaxInvoiceId(),
        restaurantId: input.restaurantId,
        orderId: ctx.orderId,
        collectionFactId: input.collectionFactId,
        documentKind: "tax_invoice",
        ...fields,
      });
      outcome = "created";
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const raced = await findSaudiTaxInvoiceByIdempotency({
        restaurantId: input.restaurantId,
        collectionFactId: input.collectionFactId,
        documentKind: "tax_invoice",
      });
      if (!raced) throw error;
      outcome = "replayed";
      taxInvoice = raced;
    }
  }

  if (
    taxInvoice.status === "generated" ||
    taxInvoice.status === "retryable"
  ) {
    taxInvoice = await applySaudiPhase1Generation(taxInvoice);
  }

  return { outcome, taxInvoice };
}

/** Read helper for tenant-scoped lookups (authorization must precede). */
export async function getSaudiTaxInvoiceForRestaurant(input: {
  restaurantId: number;
  taxInvoiceId: string;
}): Promise<SaudiTaxInvoice | null> {
  return findSaudiTaxInvoiceByTaxInvoiceId(input);
}
