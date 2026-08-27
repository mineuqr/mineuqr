/**
 * Idempotent schema verification for staging/production deploys.
 * Compares live DB against code expectations — does NOT run drizzle migrate.
 *
 * Usage: node scripts/verify-schema-deployment.cjs
 * Exit 0 = all required objects present; 1 = missing objects listed.
 */

require("dotenv").config();

const REQUIRED = {
  usersColumns: ["emailVerifiedAt", "passwordChangedAt", "sessionValidAfter"],
  usersIndexes: ["users_email_unique"],
  tables: ["auth_tokens"],
  orderReadTables: [
    "order_read_orders",
    "order_read_order_line_items",
    "order_read_order_timeline",
    "order_read_operational_kpi_daily",
    "order_read_analytics_daily",
    "order_read_public_order_status",
    "order_read_backfill_runs",
  ],
  operationalDeviceTables: ["operational_devices", "operational_device_tokens"],
  operationalDeviceColumns: [
    ["operational_devices", "screenConfig"],
    ["operational_devices", "screenConfigRevision"],
  ],
  orderReadColumns: [
    ["order_read_order_line_items", "categoryProjection"],
    ["order_read_order_line_items", "itemNotes"],
    ["order_items", "modifiers"],
    ["order_read_order_line_items", "modifiers"],
    ["order_read_orders", "serviceMode"],
    ["order_read_orders", "fulfilmentAnchorType"],
    ["order_read_orders", "fulfilmentLabel"],
    ["order_read_orders", "identityScope"],
    ["order_read_public_order_status", "identityScope"],
  ],
  orderWriteColumns: [
    ["orders", "serviceMode"],
    ["orders", "fulfilmentAnchorType"],
    ["orders", "fulfilmentLabel"],
    ["orders", "identityScope"],
  ],
  businessIdentityTables: ["order_business_day_sequences"],
  businessIdentityColumns: [
    ["order_business_day_sequences", "identity_scope"],
  ],
  businessIdentityIndexes: [
    ["orders", "uq_orders_restaurant_business_day_scope_display"],
  ],
  /** ENUM members that must appear in COLUMN_TYPE (substring match). */
  enumMembers: [
    ["operational_devices", "role", "waiter_display"],
  ],
  /** CHECK-GENERALIZATION-M1 — Check-owned Order membership. */
  checkMembershipTables: ["check_order_membership"],
  checkMembershipColumns: [
    ["check_order_membership", "id"],
    ["check_order_membership", "restaurantId"],
    ["check_order_membership", "checkId"],
    ["check_order_membership", "orderId"],
    ["check_order_membership", "enrolledAt"],
    ["check_order_membership", "enrolledReason"],
    ["check_order_membership", "active"],
  ],
  checkMembershipIndexes: [
    ["check_order_membership", "check_order_membership_check_order_unique"],
    ["check_order_membership", "check_order_membership_restaurant_id"],
    ["check_order_membership", "check_order_membership_check_id"],
    ["check_order_membership", "check_order_membership_order_id"],
    ["check_order_membership", "check_order_membership_restaurant_order"],
  ],
  /** ORDER-SETTLEMENT-PERSISTENCE-1 / ADR-ARCH-022 — Check-owned Order Settlement. */
  checkOrderSettlementTables: ["check_order_settlements"],
  checkOrderSettlementColumns: [
    ["check_order_settlements", "id"],
    ["check_order_settlements", "restaurantId"],
    ["check_order_settlements", "checkId"],
    ["check_order_settlements", "orderId"],
    ["check_order_settlements", "status"],
    ["check_order_settlements", "orderTotalSnapshot"],
    ["check_order_settlements", "allocatedAmount"],
    ["check_order_settlements", "settledAmount"],
    ["check_order_settlements", "outstandingAmount"],
  ],
  checkOrderSettlementIndexes: [
    ["check_order_settlements", "check_order_settlements_check_order_unique"],
    ["check_order_settlements", "check_order_settlements_restaurant_id"],
    ["check_order_settlements", "check_order_settlements_check_id"],
    ["check_order_settlements", "check_order_settlements_order_id"],
    ["check_order_settlements", "check_order_settlements_restaurant_order"],
    ["check_order_settlements", "check_order_settlements_restaurant_check"],
    ["check_order_settlements", "check_order_settlements_status"],
  ],
  /** SPLIT-PAYMENT-PERSISTENCE-1 / ADR-ARCH-024 — Check-owned Split Payment. */
  checkSplitPaymentTables: [
    "check_split_payments",
    "check_split_payment_tenders",
    "check_split_payment_tender_allocations",
    "check_split_payment_allocations",
    "check_split_payment_attempts",
  ],
  checkSplitPaymentColumns: [
    ["check_split_payments", "id"],
    ["check_split_payments", "restaurantId"],
    ["check_split_payments", "checkId"],
    ["check_split_payments", "paymentId"],
    ["check_split_payments", "paymentReference"],
    ["check_split_payments", "financialReference"],
    ["check_split_payments", "status"],
    ["check_split_payments", "amount"],
    ["check_split_payments", "allocatedAmount"],
    ["check_split_payments", "unallocatedAmount"],
    ["check_split_payments", "version"],
    ["check_split_payment_attempts", "attemptId"],
    ["check_split_payment_attempts", "paymentId"],
    ["check_split_payment_attempts", "externalProviderReference"],
    ["check_split_payment_tenders", "tenderId"],
    ["check_split_payment_tender_allocations", "tenderAllocationId"],
    ["check_split_payment_allocations", "allocationId"],
  ],
  checkSplitPaymentIndexes: [
    ["check_split_payments", "check_split_payments_payment_id_unique"],
    ["check_split_payments", "check_split_payments_check_payment_unique"],
    ["check_split_payments", "check_split_payments_check_payment_ref_unique"],
    ["check_split_payment_attempts", "check_split_payment_attempts_attempt_id_unique"],
    ["check_split_payment_tenders", "check_split_payment_tenders_tender_id_unique"],
    ["check_split_payment_tender_allocations", "check_split_payment_tender_alloc_id_unique"],
    ["check_split_payment_allocations", "check_split_payment_allocations_alloc_id_unique"],
  ],
  /** MULTI-CHECK-ALLOCATION-PERSISTENCE-1 / ADR-ARCH-025 */
  multiCheckAllocationTables: [
    "multi_check_allocations",
    "multi_check_allocation_sources",
    "multi_check_allocation_portions",
    "multi_check_allocation_adjustments",
    "multi_check_allocation_reversals",
    "multi_check_allocation_history",
  ],
  multiCheckAllocationColumns: [
    ["multi_check_allocations", "id"],
    ["multi_check_allocations", "restaurantId"],
    ["multi_check_allocations", "allocationId"],
    ["multi_check_allocations", "allocationReference"],
    ["multi_check_allocations", "financialReference"],
    ["multi_check_allocations", "sourceCheckId"],
    ["multi_check_allocations", "sourcePaymentId"],
    ["multi_check_allocations", "status"],
    ["multi_check_allocations", "version"],
    ["multi_check_allocations", "schemaVersion"],
    ["multi_check_allocation_portions", "portionId"],
    ["multi_check_allocation_portions", "allocationSequence"],
    ["multi_check_allocation_portions", "targetCheckId"],
    ["multi_check_allocation_adjustments", "adjustmentId"],
    ["multi_check_allocation_reversals", "reversalId"],
    ["multi_check_allocation_history", "previousRevision"],
    ["multi_check_allocation_history", "newRevision"],
    ["multi_check_allocation_history", "mutationType"],
  ],
  multiCheckAllocationIndexes: [
    ["multi_check_allocations", "mca_allocation_id_unique"],
    ["multi_check_allocations", "mca_restaurant_alloc_ref_unique"],
    ["multi_check_allocation_portions", "mca_portions_portion_id_unique"],
    ["multi_check_allocation_adjustments", "mca_adjustments_adjustment_id_unique"],
    ["multi_check_allocation_reversals", "mca_reversals_reversal_id_unique"],
  ],
  /** BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Check-owned Charge composition. */
  checkChargeTables: ["check_charges"],
  checkChargeColumns: [
    ["check_charges", "id"],
    ["check_charges", "chargeId"],
    ["check_charges", "restaurantId"],
    ["check_charges", "checkId"],
    ["check_charges", "sequence"],
    ["check_charges", "description"],
    ["check_charges", "quantity"],
    ["check_charges", "unitPrice"],
    ["check_charges", "lineDiscount"],
    ["check_charges", "modifierAmount"],
    ["check_charges", "netAmount"],
    ["check_charges", "taxCategory"],
    ["check_charges", "taxAmount"],
    ["check_charges", "currencyCode"],
    ["check_charges", "originOrderId"],
    ["check_charges", "originOrderItemId"],
    ["check_charges", "originChannel"],
    ["check_charges", "originReference"],
    ["check_charges", "createdAt"],
  ],
  checkChargeIndexes: [
    ["check_charges", "check_charges_charge_id_unique"],
    ["check_charges", "check_charges_check_sequence_unique"],
    ["check_charges", "check_charges_restaurant_id"],
    ["check_charges", "check_charges_check_id"],
    ["check_charges", "check_charges_restaurant_check"],
    ["check_charges", "check_charges_origin_order"],
  ],
  /** PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 / ADR-ARCH-039 — dormant Collection Fact. */
  collectionFactTables: ["payment_collection_facts"],
  collectionFactColumns: [
    ["payment_collection_facts", "id"],
    ["payment_collection_facts", "collectionFactId"],
    ["payment_collection_facts", "restaurantId"],
    ["payment_collection_facts", "orderId"],
    ["payment_collection_facts", "paymentIntentId"],
    ["payment_collection_facts", "orderingChannel"],
    ["payment_collection_facts", "kind"],
    ["payment_collection_facts", "purpose"],
    ["payment_collection_facts", "schemaVersion"],
    ["payment_collection_facts", "subtotal"],
    ["payment_collection_facts", "discountAmount"],
    ["payment_collection_facts", "taxAmount"],
    ["payment_collection_facts", "amount"],
    ["payment_collection_facts", "currencyCode"],
    ["payment_collection_facts", "currencySnapshotJson"],
    ["payment_collection_facts", "taxPolicySnapshotJson"],
    ["payment_collection_facts", "taxBreakdownJson"],
    ["payment_collection_facts", "compositionJson"],
    ["payment_collection_facts", "tendersJson"],
    ["payment_collection_facts", "checkId"],
    ["payment_collection_facts", "actorType"],
    ["payment_collection_facts", "actorId"],
    ["payment_collection_facts", "terminalId"],
    ["payment_collection_facts", "businessDay"],
    ["payment_collection_facts", "idempotencyKey"],
    ["payment_collection_facts", "fingerprint"],
    ["payment_collection_facts", "committedAt"],
    ["payment_collection_facts", "createdAt"],
  ],
  collectionFactIndexes: [
    ["payment_collection_facts", "payment_collection_facts_fact_id_unique"],
    ["payment_collection_facts", "payment_collection_facts_idempotency_unique"],
    ["payment_collection_facts", "payment_collection_facts_intent_unique"],
    ["payment_collection_facts", "payment_collection_facts_restaurant_id"],
    ["payment_collection_facts", "payment_collection_facts_restaurant_order"],
    ["payment_collection_facts", "payment_collection_facts_restaurant_purpose"],
    ["payment_collection_facts", "payment_collection_facts_business_day"],
    ["payment_collection_facts", "payment_collection_facts_channel"],
  ],
  collectionFactEnumMembers: [
    ["payment_collection_facts", "purpose", "synthetic"],
    ["payment_collection_facts", "purpose", "shadow"],
    ["payment_collection_facts", "purpose", "test"],
    ["payment_collection_facts", "purpose", "validation"],
    ["payment_collection_facts", "purpose", "production"],
    ["payment_collection_facts", "kind", "collection"],
  ],
  /** CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1 — non-financial Incoming Queue membership. */
  cashierHandoffTables: ["cashier_order_handoffs"],
  cashierHandoffColumns: [
    ["cashier_order_handoffs", "restaurantId"],
    ["cashier_order_handoffs", "orderId"],
    ["cashier_order_handoffs", "sourceChannel"],
    ["cashier_order_handoffs", "sessionId"],
    ["cashier_order_handoffs", "handedOffAt"],
  ],
  cashierHandoffIndexes: [
    ["cashier_order_handoffs", "cashier_order_handoffs_pk"],
    ["cashier_order_handoffs", "cashier_order_handoffs_restaurant_handed_off"],
  ],
};

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function enumMemberExists(conn, table, column, member) {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE AS columnType FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const columnType = String(rows[0].columnType ?? "");
  return columnType.includes(`'${member}'`);
}

async function main() {
  const { createAuditReadonlyConnection } = await import("./lib/tidb-audit-connection.mjs");
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[schema-verify] DATABASE_URL is required");
    process.exit(1);
  }

  const conn = await createAuditReadonlyConnection(url);
  const missing = [];

  try {
    for (const col of REQUIRED.usersColumns) {
      if (!(await columnExists(conn, "users", col))) {
        missing.push(`users.${col}`);
      }
    }
    for (const idx of REQUIRED.usersIndexes) {
      if (!(await indexExists(conn, "users", idx))) {
        missing.push(`index:users.${idx}`);
      }
    }
    for (const table of REQUIRED.tables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const table of REQUIRED.orderReadTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const table of REQUIRED.operationalDeviceTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.operationalDeviceColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, column] of REQUIRED.orderReadColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, column] of REQUIRED.orderWriteColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const table of REQUIRED.businessIdentityTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.businessIdentityColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.businessIdentityIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const [table, column, member] of REQUIRED.enumMembers) {
      if (!(await enumMemberExists(conn, table, column, member))) {
        missing.push(`enum:${table}.${column}.${member}`);
      }
    }
    for (const table of REQUIRED.checkMembershipTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.checkMembershipColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.checkMembershipIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const table of REQUIRED.checkOrderSettlementTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.checkOrderSettlementColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.checkOrderSettlementIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const table of REQUIRED.checkSplitPaymentTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.checkSplitPaymentColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.checkSplitPaymentIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const table of REQUIRED.multiCheckAllocationTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.multiCheckAllocationColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.multiCheckAllocationIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const table of REQUIRED.checkChargeTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.checkChargeColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.checkChargeIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const table of REQUIRED.collectionFactTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.collectionFactColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.collectionFactIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }
    for (const [table, column, member] of REQUIRED.collectionFactEnumMembers) {
      if (!(await enumMemberExists(conn, table, column, member))) {
        missing.push(`enum:${table}.${column}.${member}`);
      }
    }
    for (const table of REQUIRED.cashierHandoffTables) {
      if (!(await tableExists(conn, table))) {
        missing.push(`table:${table}`);
      }
    }
    for (const [table, column] of REQUIRED.cashierHandoffColumns) {
      if (!(await columnExists(conn, table, column))) {
        missing.push(`${table}.${column}`);
      }
    }
    for (const [table, indexName] of REQUIRED.cashierHandoffIndexes) {
      if (!(await indexExists(conn, table, indexName))) {
        missing.push(`index:${table}.${indexName}`);
      }
    }

    if (missing.length === 0) {
      console.log(
        "[schema-verify] OK — required schema objects present (auth, order-read, operational-device, fulfilment, business-identity-scope, waiter_display, check-order-membership, check-order-settlements, check-charges, payment-collection-facts, cashier-order-handoffs)."
      );
      return;
    }

    console.error("[schema-verify] MISSING required objects:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error(
      "[schema-verify] Fix: node scripts/migration-preflight.cjs && pnpm exec drizzle-kit migrate"
    );
    console.error(
      "[schema-verify] Production: see scripts/recovery/migration-0054-0057-preflight.mjs"
    );
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[schema-verify] Failed:", err.message);
  process.exit(1);
});
