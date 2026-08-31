/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — ensure service tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../operational-session/payment/collection-fact/collectionFactRepository", () => ({
  findCollectionFactByFactId: vi.fn(),
}));
vi.mock("../../saudi-tax-profile/saudiTaxProfileRepository", () => ({
  findSaudiTaxProfileByRestaurantId: vi.fn(),
}));
vi.mock("../../../customer/customerRepository", () => ({
  findCustomerById: vi.fn(),
}));
vi.mock("../../../db", () => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
}));
vi.mock("../saudiTaxInvoiceRepository", () => ({
  findSaudiTaxInvoiceByIdempotency: vi.fn(),
  findSaudiTaxInvoiceByTaxInvoiceId: vi.fn(),
  insertSaudiTaxInvoiceRow: vi.fn(),
  upgradeSaudiTaxInvoiceRow: vi.fn(),
}));

import { findCollectionFactByFactId } from "../../../operational-session/payment/collection-fact/collectionFactRepository";
import { findSaudiTaxProfileByRestaurantId } from "../../saudi-tax-profile/saudiTaxProfileRepository";
import { findCustomerById } from "../../../customer/customerRepository";
import { getOrderById, getOrderItemsByOrderId } from "../../../db";
import {
  findSaudiTaxInvoiceByIdempotency,
  insertSaudiTaxInvoiceRow,
  upgradeSaudiTaxInvoiceRow,
} from "../saudiTaxInvoiceRepository";
import { ensureSaudiTaxInvoiceForCollectionFact } from "../saudiTaxInvoiceService";

const findCf = vi.mocked(findCollectionFactByFactId);
const findProfile = vi.mocked(findSaudiTaxProfileByRestaurantId);
const findCustomer = vi.mocked(findCustomerById);
const findOrder = vi.mocked(getOrderById);
const findItems = vi.mocked(getOrderItemsByOrderId);
const findInvoice = vi.mocked(findSaudiTaxInvoiceByIdempotency);
const insertInvoice = vi.mocked(insertSaudiTaxInvoiceRow);
const upgradeInvoice = vi.mocked(upgradeSaudiTaxInvoiceRow);

function baseCf(overrides: Record<string, unknown> = {}) {
  return {
    collectionFactId: "pcf_1",
    restaurantId: 10,
    orderId: 100,
    paymentIntentId: "pi_1",
    orderingChannel: "cashier_pos",
    kind: "collection" as const,
    purpose: "production" as const,
    schemaVersion: 1,
    subtotal: "50.00",
    discountAmount: "0.00",
    taxAmount: "7.50",
    amount: "57.50",
    currencyCode: "SAR",
    currencySnapshot: {},
    taxPolicySnapshot: {},
    taxBreakdown: {},
    composition: [
      {
        sequence: 1,
        description: "Item",
        netAmount: "50.00",
        taxAmount: "7.50",
        originOrderId: 100,
      },
    ],
    tenders: [{ paymentMethod: "cash", amount: "57.50" }],
    checkId: null,
    actorType: null,
    actorId: null,
    terminalId: null,
    businessDay: "2026-08-31",
    idempotencyKey: "idem_1",
    fingerprint: "fp",
    committedAt: "2026-08-31T12:00:00.000Z",
    createdAt: "2026-08-31T12:00:00.000Z",
    ...overrides,
  };
}

function readyProfile() {
  return {
    id: 1,
    restaurantId: 10,
    countryCode: "SA" as const,
    legalName: "Seller Co",
    vatRegistrationStatus: "registered" as const,
    vatNumber: "300000000000003",
    registeredAddress: "Riyadh",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("ensureSaudiTaxInvoiceForCollectionFact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCf.mockResolvedValue(baseCf() as never);
    findOrder.mockResolvedValue({
      id: 100,
      restaurantId: 10,
      customerId: null,
    } as never);
    findItems.mockResolvedValue([
      {
        id: 1,
        menuItemId: 9,
        nameAr: "شاي",
        nameEn: "Tea",
        price: "10.00",
        quantity: 2,
        notes: null,
        modifiers: null,
      },
    ] as never);
    findProfile.mockResolvedValue(readyProfile() as never);
    findCustomer.mockResolvedValue(null);
    findInvoice.mockResolvedValue(null);
    insertInvoice.mockImplementation(async (row) => ({
      id: 1,
      taxInvoiceId: row.taxInvoiceId,
      restaurantId: row.restaurantId,
      orderId: row.orderId,
      collectionFactId: row.collectionFactId,
      documentKind: "tax_invoice",
      status: row.status,
      partyModel: row.partyModel,
      invoiceForm: row.invoiceForm,
      classificationRationaleCode: row.classificationRationaleCode,
      classification: row.classificationJson as never,
      sellerSnapshot: row.sellerSnapshotJson as never,
      buyerSnapshot: row.buyerSnapshotJson as never,
      linesSnapshot: row.linesSnapshotJson as never,
      monetarySnapshot: row.monetarySnapshotJson as never,
      paymentSnapshot: row.paymentSnapshotJson as never,
      sourceCustomerId: row.sourceCustomerId ?? null,
      profileReadinessAtIssuance: row.profileReadinessAtIssuance ?? null,
      failureCode: row.failureCode ?? null,
      failureMessage: row.failureMessage ?? null,
      attemptCount: row.attemptCount ?? 1,
      issuedAt: row.issuedAt ?? null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    }));
  });

  it("creates a generated Tax Invoice with independent identity and snapshots", async () => {
    const result = await ensureSaudiTaxInvoiceForCollectionFact({
      collectionFactId: "pcf_1",
      restaurantId: 10,
      countryCode: "SA",
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "created",
    });
    expect(result.outcome).toBe("created");
    expect(result.taxInvoice.taxInvoiceId).toMatch(/^sti_/);
    expect(result.taxInvoice.taxInvoiceId).not.toBe("pcf_1");
    expect(result.taxInvoice.status).toBe("generated");
    expect(result.taxInvoice.partyModel).toBe("b2c");
    expect(result.taxInvoice.buyerSnapshot.kind).toBe("anonymous_cash");
    expect(result.taxInvoice.sellerSnapshot.legalName).toBe("Seller Co");
    expect(result.taxInvoice.linesSnapshot.orderLines[0]?.nameAr).toBe("شاي");
    expect(result.taxInvoice.monetarySnapshot.source).toBe("collection_fact");
    expect(result.taxInvoice.monetarySnapshot.taxAmountMeaning).toBe(
      "collection_fact_copy_not_saudi_vat_engine"
    );
    expect(insertInvoice).toHaveBeenCalledTimes(1);
  });

  it("blocks generation when Tax Profile is not READY without inventing a legal document", async () => {
    findProfile.mockResolvedValue(null);
    const result = await ensureSaudiTaxInvoiceForCollectionFact({
      collectionFactId: "pcf_1",
      restaurantId: 10,
      countryCode: "SA",
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "created",
    });
    expect(result.taxInvoice.status).toBe("blocked_profile");
    expect(result.taxInvoice.failureCode).toBe("PROFILE_NOT_READY");
    expect(result.taxInvoice.sellerSnapshot.kind).toBe("not_configured");
  });

  it("replays the same aggregate for duplicate collectionFactId + document kind", async () => {
    const existing = {
      id: 9,
      taxInvoiceId: "sti_existing",
      restaurantId: 10,
      orderId: 100,
      collectionFactId: "pcf_1",
      documentKind: "tax_invoice" as const,
      status: "generated" as const,
      partyModel: "b2c" as const,
      invoiceForm: "simplified_tax_invoice" as const,
      classificationRationaleCode: "FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT",
      classification: {
        partyModel: "b2c" as const,
        invoiceForm: "simplified_tax_invoice" as const,
        rationaleCode: "FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT",
        policyStatus: "platform_invariant" as const,
        blockingIssues: [],
        notes: "",
      },
      sellerSnapshot: {
        kind: "ready" as const,
        profileId: 1,
        legalName: "Seller Co",
        vatRegistrationStatus: "registered",
        vatNumber: "300000000000003",
        registeredAddress: "Riyadh",
      },
      buyerSnapshot: {
        kind: "anonymous_cash" as const,
        customerId: null,
        displayName: null,
        customerType: null,
        phone: null,
        email: null,
        address: null,
        taxNumber: null,
      },
      linesSnapshot: {
        source: "order_items_plus_collection_fact_composition" as const,
        orderLines: [],
        collectionFactComposition: [],
        vatLineSsot: "deferred_oq_vat_1" as const,
      },
      monetarySnapshot: {
        source: "collection_fact" as const,
        subtotal: "50.00",
        discountAmount: "0.00",
        taxAmount: "7.50",
        amount: "57.50",
        currencyCode: "SAR",
        taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine" as const,
        oqVat1: "deferred" as const,
      },
      paymentSnapshot: {
        source: "collection_fact" as const,
        tenders: [{ paymentMethod: "cash", amount: "57.50" }],
      },
      sourceCustomerId: null,
      profileReadinessAtIssuance: "READY",
      failureCode: null,
      failureMessage: null,
      attemptCount: 1,
      issuedAt: "2026-08-31 12:00:00",
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    };
    findInvoice.mockResolvedValue(existing);
    const result = await ensureSaudiTaxInvoiceForCollectionFact({
      collectionFactId: "pcf_1",
      restaurantId: 10,
      countryCode: "SA",
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "replayed",
    });
    expect(result.outcome).toBe("replayed");
    expect(result.taxInvoice.taxInvoiceId).toBe("sti_existing");
    expect(insertInvoice).not.toHaveBeenCalled();
    expect(upgradeInvoice).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant order references", async () => {
    findOrder.mockResolvedValue({
      id: 100,
      restaurantId: 999,
      customerId: null,
    } as never);
    await expect(
      ensureSaudiTaxInvoiceForCollectionFact({
        collectionFactId: "pcf_1",
        restaurantId: 10,
        countryCode: "SA",
        orderId: 100,
        committedAt: "2026-08-31T12:00:00.000Z",
        commitOutcome: "created",
      })
    ).rejects.toThrow(/cross-tenant/i);
  });

  it("snapshots customer buyer fields without using taxNumber as B2B oracle", async () => {
    findOrder.mockResolvedValue({
      id: 100,
      restaurantId: 10,
      customerId: 55,
    } as never);
    findCustomer.mockResolvedValue({
      id: 55,
      restaurantId: 10,
      displayName: "Acme",
      customerType: "business",
      phone: null,
      email: null,
      address: null,
      taxNumber: "300111111111113",
      status: "active",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    const result = await ensureSaudiTaxInvoiceForCollectionFact({
      collectionFactId: "pcf_1",
      restaurantId: 10,
      countryCode: "SA",
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "created",
    });
    expect(result.taxInvoice.buyerSnapshot.kind).toBe("customer");
    expect(result.taxInvoice.buyerSnapshot.taxNumber).toBe("300111111111113");
    expect(result.taxInvoice.partyModel).toBe("unclassified");
    expect(result.taxInvoice.invoiceForm).toBe("undetermined");
  });

  it("upgrades blocked_profile to generated when profile becomes READY", async () => {
    findInvoice.mockResolvedValue({
      id: 2,
      taxInvoiceId: "sti_blocked",
      restaurantId: 10,
      orderId: 100,
      collectionFactId: "pcf_1",
      documentKind: "tax_invoice",
      status: "blocked_profile",
      partyModel: "b2c",
      invoiceForm: "simplified_tax_invoice",
      classificationRationaleCode: "FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT",
      classification: {
        partyModel: "b2c",
        invoiceForm: "simplified_tax_invoice",
        rationaleCode: "FOUNDATION_ANONYMOUS_BUYER_B2C_CONTEXT",
        policyStatus: "platform_invariant",
        blockingIssues: [],
        notes: "",
      },
      sellerSnapshot: {
        kind: "not_configured",
        profileId: null,
        legalName: null,
        vatRegistrationStatus: null,
        vatNumber: null,
        registeredAddress: null,
      },
      buyerSnapshot: {
        kind: "anonymous_cash",
        customerId: null,
        displayName: null,
        customerType: null,
        phone: null,
        email: null,
        address: null,
        taxNumber: null,
      },
      linesSnapshot: {
        source: "order_items_plus_collection_fact_composition",
        orderLines: [],
        collectionFactComposition: [],
        vatLineSsot: "deferred_oq_vat_1",
      },
      monetarySnapshot: {
        source: "collection_fact",
        subtotal: "50.00",
        discountAmount: "0.00",
        taxAmount: "7.50",
        amount: "57.50",
        currencyCode: "SAR",
        taxAmountMeaning: "collection_fact_copy_not_saudi_vat_engine",
        oqVat1: "deferred",
      },
      paymentSnapshot: { source: "collection_fact", tenders: [] },
      sourceCustomerId: null,
      profileReadinessAtIssuance: "NOT_CONFIGURED",
      failureCode: "PROFILE_NOT_READY",
      failureMessage: "blocked",
      attemptCount: 1,
      issuedAt: null,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:00:00.000Z",
    } as never);
    upgradeInvoice.mockImplementation(async (row) => ({
      id: 2,
      taxInvoiceId: row.taxInvoiceId,
      restaurantId: row.restaurantId,
      orderId: 100,
      collectionFactId: "pcf_1",
      documentKind: "tax_invoice" as const,
      status: row.status,
      partyModel: row.partyModel,
      invoiceForm: row.invoiceForm,
      classificationRationaleCode: row.classificationRationaleCode,
      classification: row.classificationJson as never,
      sellerSnapshot: row.sellerSnapshotJson as never,
      buyerSnapshot: row.buyerSnapshotJson as never,
      linesSnapshot: row.linesSnapshotJson as never,
      monetarySnapshot: row.monetarySnapshotJson as never,
      paymentSnapshot: row.paymentSnapshotJson as never,
      sourceCustomerId: row.sourceCustomerId,
      profileReadinessAtIssuance: row.profileReadinessAtIssuance,
      failureCode: row.failureCode,
      failureMessage: row.failureMessage,
      attemptCount: row.attemptCount,
      issuedAt: row.issuedAt,
      createdAt: "2026-08-31T12:00:00.000Z",
      updatedAt: "2026-08-31T12:01:00.000Z",
    }));

    const result = await ensureSaudiTaxInvoiceForCollectionFact({
      collectionFactId: "pcf_1",
      restaurantId: 10,
      countryCode: "SA",
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "replayed",
    });
    expect(result.outcome).toBe("upgraded");
    expect(result.taxInvoice.status).toBe("generated");
    expect(upgradeInvoice).toHaveBeenCalledTimes(1);
    expect(insertInvoice).not.toHaveBeenCalled();
  });
});
