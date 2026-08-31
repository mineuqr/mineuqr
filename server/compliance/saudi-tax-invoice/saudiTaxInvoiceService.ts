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
import {
  buildBuyerSnapshot,
  buildLinesSnapshot,
  buildMonetarySnapshot,
  buildPaymentSnapshot,
  buildSellerSnapshot,
} from "./saudiTaxInvoiceSnapshotBuilder";

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

  const collectionFact = await findCollectionFactByFactId({
    restaurantId: input.restaurantId,
    collectionFactId: input.collectionFactId,
  });
  if (!collectionFact) {
    throw new Error(
      `Collection Fact not found for Tax Invoice: ${input.collectionFactId}`
    );
  }
  if (collectionFact.orderId !== input.orderId) {
    throw new Error("Collection Fact orderId mismatch for Tax Invoice");
  }

  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new Error(
      `Sale/order not found or cross-tenant for Tax Invoice: ${input.orderId}`
    );
  }

  const profile = await findSaudiTaxProfileByRestaurantId(input.restaurantId);
  const { readiness } = evaluateSaudiTaxProfileReadiness(profile);

  let customer = null;
  if (order.customerId != null) {
    customer = await findCustomerById(input.restaurantId, order.customerId);
  }

  const orderItems = await getOrderItemsByOrderId(input.orderId);
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

  const status: SaudiTaxInvoiceStatus =
    readiness === "READY" ? "generated" : "blocked_profile";

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
  };
}

function toPersistFields(
  ctx: Awaited<ReturnType<typeof loadIssuanceContext>>,
  attemptCount: number
) {
  const issuedAt =
    ctx.status === "generated" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;
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
    failureCode:
      ctx.status === "blocked_profile" ? "PROFILE_NOT_READY" : null,
    failureMessage:
      ctx.status === "blocked_profile"
        ? `Saudi Tax Profile readiness is ${ctx.readiness}; Tax Invoice generation blocked (PAID unchanged).`
        : null,
    attemptCount,
    issuedAt,
  };
}

/**
 * Idempotent ensure: same restaurant + collectionFactId + documentKind → one aggregate.
 */
export async function ensureSaudiTaxInvoiceForCollectionFact(
  input: EnsureSaudiTaxInvoiceInput
): Promise<EnsureSaudiTaxInvoiceResult> {
  const existing = await findSaudiTaxInvoiceByIdempotency({
    restaurantId: input.restaurantId,
    collectionFactId: input.collectionFactId,
    documentKind: "tax_invoice",
  });

  const ctx = await loadIssuanceContext(input);

  if (existing) {
    if (isSaudiTaxInvoiceSnapshotImmutable(existing.status)) {
      return { outcome: "replayed", taxInvoice: existing };
    }

    assertSaudiTaxInvoiceStatusTransition(existing.status, ctx.status);
    const fields = toPersistFields(ctx, existing.attemptCount + 1);
    const upgraded = await upgradeSaudiTaxInvoiceRow({
      restaurantId: input.restaurantId,
      taxInvoiceId: existing.taxInvoiceId,
      ...fields,
    });
    return { outcome: "upgraded", taxInvoice: upgraded };
  }

  const fields = toPersistFields(ctx, 1);
  try {
    const created = await insertSaudiTaxInvoiceRow({
      taxInvoiceId: buildTaxInvoiceId(),
      restaurantId: input.restaurantId,
      orderId: ctx.orderId,
      collectionFactId: input.collectionFactId,
      documentKind: "tax_invoice",
      ...fields,
    });
    return { outcome: "created", taxInvoice: created };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const raced = await findSaudiTaxInvoiceByIdempotency({
      restaurantId: input.restaurantId,
      collectionFactId: input.collectionFactId,
      documentKind: "tax_invoice",
    });
    if (!raced) throw error;
    return { outcome: "replayed", taxInvoice: raced };
  }
}

/** Read helper for tenant-scoped lookups (authorization must precede). */
export async function getSaudiTaxInvoiceForRestaurant(input: {
  restaurantId: number;
  taxInvoiceId: string;
}): Promise<SaudiTaxInvoice | null> {
  return findSaudiTaxInvoiceByTaxInvoiceId(input);
}
