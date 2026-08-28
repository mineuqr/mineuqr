import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_TAIL_TAGS,
  CANONICAL_MIGRATION_TAIL_TAG,
  CANONICAL_JOURNAL_ENTRY_COUNT,
  LEGACY_ORPHAN_SQL_TAGS,
  findGovernanceViolations,
  hashMigrationSql,
  loadJournal,
  validateJournalOrdering,
} from "../lib/migration-governance-lib.cjs";

const repoRoot = join(__dirname, "../..");

describe("MIGRATION-GOVERNANCE-RESTORATION-1 regression guards", () => {
  it("journal contains canonical migrations 0000–0102 contiguously", () => {
    const journal = loadJournal();
    expect(journal.entries).toHaveLength(CANONICAL_JOURNAL_ENTRY_COUNT);
    expect(journal.entries[0]?.tag).toBe("0000_shiny_blizzard");
    expect(journal.entries[59]?.tag).toBe("0059_order_read_offer_projection");
    expect(journal.entries[60]?.tag).toBe("0060_device_activation_code");
    expect(journal.entries[61]?.tag).toBe("0061_order_business_identity");
    expect(journal.entries[62]?.tag).toBe("0062_order_lifecycle_stage");
    expect(journal.entries[63]?.tag).toBe("0063_screen_credential_ciphertext");
    expect(journal.entries[64]?.tag).toBe("0064_order_read_item_notes");
    expect(journal.entries[65]?.tag).toBe("0065_order_fulfilment_projection");
    expect(journal.entries[66]?.tag).toBe("0066_order_business_identity_scope");
    expect(journal.entries[67]?.tag).toBe("0067_operational_device_waiter_display");
    expect(journal.entries[68]?.tag).toBe("0068_order_read_modifiers");
    expect(journal.entries[69]?.tag).toBe("0069_check_management");
    expect(journal.entries[70]?.tag).toBe("0070_check_settlement_transactions");
    expect(journal.entries[71]?.tag).toBe("0071_check_order_membership");
    expect(journal.entries[72]?.tag).toBe("0072_check_session_optionality");
    expect(journal.entries[73]?.tag).toBe("0073_check_order_settlements");
    expect(journal.entries[74]?.tag).toBe("0074_check_split_payments");
    expect(journal.entries[75]?.tag).toBe("0075_multi_check_allocation");
    expect(journal.entries[76]?.tag).toBe("0076_settlement_records");
    expect(journal.entries[77]?.tag).toBe("0077_crmp");
    expect(journal.entries[78]?.tag).toBe("0078_crmp_shift_lifecycle");
    expect(journal.entries[79]?.tag).toBe("0079_crmp_register_duty");
    expect(journal.entries[80]?.tag).toBe("0080_crmp_register_catalog");
    expect(journal.entries[81]?.tag).toBe("0081_crmp_financial_shift_number");
    expect(journal.entries[82]?.tag).toBe("0082_refund_document_numbering");
    expect(journal.entries[83]?.tag).toBe("0083_order_ordering_channel");
    expect(journal.entries[84]?.tag).toBe("0084_commercial_catalog_foundation");
    expect(journal.entries[85]?.tag).toBe("0085_commercial_catalog_adoption_bindings");
    expect(journal.entries[86]?.tag).toBe("0086_commercial_live_plans");
    expect(journal.entries[87]?.tag).toBe("0087_platform_owner_access_mode");
    expect(journal.entries[88]?.tag).toBe("0088_user_subscriptions_live_plan_identity");
    expect(journal.entries[89]?.tag).toBe("0089_commercial_charged_terms_snapshots");
    expect(journal.entries[90]?.tag).toBe("0090_commercial_subscription_concessions");
    expect(journal.entries[91]?.tag).toBe("0091_pos_terminals");
    expect(journal.entries[92]?.tag).toBe("0092_pos_permission_grants");
    expect(journal.entries[93]?.tag).toBe("0093_pos_sale_idempotency");
    expect(journal.entries[94]?.tag).toBe("0094_commercial_limit_occupancy_locks");
    expect(journal.entries[95]?.tag).toBe("0095_check_charges");
    expect(journal.entries[96]?.tag).toBe("0096_payment_collection_facts");
    expect(journal.entries[97]?.tag).toBe(
      "0097_payment_collection_facts_production_purpose"
    );
    expect(journal.entries[98]?.tag).toBe("0098_pos_sale_idempotency_open_check");
    expect(journal.entries[99]?.tag).toBe("0099_cashier_order_handoffs");
    expect(journal.entries[100]?.tag).toBe(
      "0100_crmp_collection_fact_attribution"
    );
    expect(journal.entries[101]?.tag).toBe("0101_cashier_invoices");
    expect(journal.entries[102]?.tag).toBe(CANONICAL_MIGRATION_TAIL_TAG);
    expect(validateJournalOrdering()).toEqual([]);
  });

  it("exports certified migration tail constant", () => {
    expect(CANONICAL_MIGRATION_TAIL_TAG).toBe("0102_order_create_idempotency");
    expect(CANONICAL_JOURNAL_ENTRY_COUNT).toBe(103);
    const tags = loadJournal().entries.map((e) => e.tag);
    expect(tags[tags.length - 1]).toBe(CANONICAL_MIGRATION_TAIL_TAG);
  });

  it("registers restored tail migrations 0054–0057", () => {
    const tags = loadJournal().entries.map((e) => e.tag);
    for (const tag of CANONICAL_TAIL_TAGS) {
      expect(tags).toContain(tag);
    }
  });

  it("has no non-legacy orphan SQL files", () => {
    const v = findGovernanceViolations();
    expect(v.nonLegacyOrphans).toEqual([]);
  });

  it("documents legacy orphan SQL separately from canonical lineage", () => {
    const v = findGovernanceViolations();
    expect(v.legacyOrphans.sort()).toEqual([...LEGACY_ORPHAN_SQL_TAGS].sort());
  });

  it("journal tags have matching SQL files with stable hashes", () => {
    for (const entry of loadJournal().entries) {
      expect(() => hashMigrationSql(entry.tag)).not.toThrow();
    }
  });

  it("governance guard script enforces deploy gate", () => {
    const guard = readFileSync(join(repoRoot, "scripts/migration-governance-guard.cjs"), "utf8");
    expect(guard).toContain("CANONICAL_MIGRATION_TAIL_TAG");
    expect(guard).toContain("CANONICAL_JOURNAL_ENTRY_COUNT");
    expect(guard).toContain("process.exit(1)");
  });

  it("verify-schema covers operational device governance objects", () => {
    const verify = readFileSync(join(repoRoot, "scripts/verify-schema-deployment.cjs"), "utf8");
    expect(verify).toContain("operational_devices");
    expect(verify).toContain("screenConfigRevision");
    expect(verify).toContain("categoryProjection");
    expect(verify).toContain("itemNotes");
    expect(verify).toContain("fulfilmentLabel");
    expect(verify).toContain("serviceMode");
    expect(verify).toContain("waiter_display");
    expect(verify).toContain("check_order_membership");
    expect(verify).toContain("check_order_settlements");
    expect(verify).toContain("check_split_payments");
    expect(verify).toContain("check_charges");
    expect(verify).toContain("payment_collection_facts");
    expect(verify).toContain("cashier_order_handoffs");
    expect(verify).toContain("cashier_invoice_sequences");
    expect(verify).toContain("cashier_invoices");
    expect(verify).toContain("order_create_idempotency");
  });

  it("vercel build runs governance guard before compile", () => {
    const vercel = readFileSync(join(repoRoot, "vercel.json"), "utf8");
    expect(vercel).toContain("migration-governance-guard");
  });

  it("0089 is additive empty Charged Terms snapshots and does not backfill Binding prices", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0089_commercial_charged_terms_snapshots.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `commercial_subscription_charged_terms`");
    expect(sql).toContain("CREATE INDEX `commercial_charged_terms_sub_effective_idx`");
    expect(sql).not.toMatch(/INSERT\s+INTO\s+`commercial_subscription_charged_terms`/i);
    expect(sql).not.toContain("FROM `commercial_subscription_bindings`");
    expect(sql).not.toContain("780001");
    expect(sql).not.toMatch(/DROP COLUMN `chargedAmount`/);
    expect(sql).not.toMatch(/DROP TABLE `commercial_subscription_bindings`/);
    expect(sql).not.toContain("user_subscriptions");
    expect(sql).not.toContain("subscription_plans");
    expect(sql).not.toContain("commercial_prices");
    expect(sql).not.toContain("priceMonthly");
  });

  it("0090 is additive concession table and does not backfill or touch prices", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0090_commercial_subscription_concessions.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `commercial_subscription_concessions`");
    expect(sql).toContain("CREATE INDEX `commercial_concessions_sub_status_ends_idx`");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+/i);
    expect(sql).not.toMatch(/DELETE\s+/i);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toContain("780001");
    expect(sql).not.toContain("subscription_plans");
    expect(sql).not.toContain("chargedAmount");
  });

  it("0091 is additive POS terminal table and does not touch devices or registers", () => {
    const sql = readFileSync(join(repoRoot, "drizzle/0091_pos_terminals.sql"), "utf8");
    expect(sql).toContain("CREATE TABLE `pos_terminals`");
    expect(sql).toContain("pos_terminals_restaurant_code_unique");
    expect(sql).toContain("pos_terminals_restaurant_lifecycle");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+/i);
    expect(sql).not.toMatch(/DELETE\s+/i);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/CREATE TABLE `operational_devices`/);
    expect(sql).not.toMatch(/CREATE TABLE `crmp_registers`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
  });

  it("0094 is additive occupancy lock table and is not a counter or limit", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0094_commercial_limit_occupancy_locks.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `commercial_limit_occupancy_locks`");
    expect(sql).toContain("commercial_limit_occupancy_locks_pk");
    expect(sql).toContain("PRIMARY KEY(`scopeKind`,`scopeId`,`limitKey`)");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+/i);
    expect(sql).not.toMatch(/DELETE\s+/i);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/ALTER TABLE/i);
    expect(hashMigrationSql("0094_commercial_limit_occupancy_locks")).toBe(
      "134a49bf9ce3e329e019bbd5f85b485aab48f46d0480140257915751caa85d47"
    );
  });

  it("0095 is additive check_charges and is not membership or a Payment table", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0095_check_charges.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `check_charges`");
    expect(sql).toContain("`restaurantId` int NOT NULL");
    expect(sql).toContain("check_charges_charge_id_unique");
    expect(sql).toContain("check_charges_check_sequence_unique");
    expect(sql).not.toMatch(/CREATE TABLE `bill_orders`/);
    expect(sql).not.toMatch(/CREATE TABLE `check_payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(hashMigrationSql("0095_check_charges")).toBe(
      "02f6ad22808cf79e6a54ae2d174d0bce310760f4b7de425c69e3739f12d08cca"
    );
  });

  it("0096 is additive payment_collection_facts and is not a payments table or Check rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0096_payment_collection_facts.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `payment_collection_facts`");
    expect(sql).toContain("`purpose` enum('synthetic','shadow','test','validation') NOT NULL");
    expect(sql).toContain("payment_collection_facts_idempotency_unique");
    expect(sql).toContain("payment_collection_facts_intent_unique");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/FOREIGN KEY/i);
    expect(hashMigrationSql("0096_payment_collection_facts")).toBe(
      "ae387c23fc92e9ac9769552f125fec5780d58eff3af59c3baa6306c235a0cb1f"
    );
  });

  it("0097 is additive purpose enum expansion and is not a payments table or financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0097_payment_collection_facts_production_purpose.sql"),
      "utf8"
    );
    expect(sql).toContain("ALTER TABLE `payment_collection_facts`");
    expect(sql).toContain(
      "enum('synthetic','shadow','test','validation','production')"
    );
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/FOREIGN KEY/i);
    expect(hashMigrationSql("0097_payment_collection_facts_production_purpose")).toBe(
      "8c92973d8d62797db46067b61e485d2036d6fae0e7e6c952a7e9ffcdf636fc45"
    );
  });

  it("0098 is additive POS sale OPEN Check columns and is not an Order/Check/financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0098_pos_sale_idempotency_open_check.sql"),
      "utf8"
    );
    expect(sql).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql).toContain("ADD COLUMN `checkId` int NOT NULL");
    expect(sql).toContain("ADD COLUMN `linesJson` json NOT NULL");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/TRUNCATE\s+/i);
    expect(hashMigrationSql("0098_pos_sale_idempotency_open_check")).toBe(
      "021e88b6bab788b5043ab98425870d0c662bd3ac33cb3d76b1de58983c34469e"
    );
  });

  it("0099 is additive non-financial Cashier Handoff membership and is not a financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0099_cashier_order_handoffs.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `cashier_order_handoffs`");
    expect(sql).toContain("PRIMARY KEY(`restaurantId`,`orderId`)");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `pos_sale_idempotency`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
  });

  it("0100 is additive CRMP Collection Fact attribution identity and is not a financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0100_crmp_collection_fact_attribution.sql"),
      "utf8"
    );
    expect(sql).toContain("ALTER TABLE `crmp_settlement_attributions`");
    expect(sql).toContain("collectionFactId");
    expect(sql).toContain("crmp_settlement_attributions_cf_unique");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
  });

  it("0101 is additive Cashier invoice identity and is not a financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0101_cashier_invoices.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `cashier_invoice_sequences`");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `cashier_invoices`");
    expect(sql).toContain("PRIMARY KEY (`restaurantId`, `orderId`)");
    expect(sql).toContain(
      "UNIQUE KEY `cashier_invoices_restaurant_sequence_unique`"
    );
    expect(sql).not.toContain("business_day");
    expect(sql).not.toContain("businessDay");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `pos_sale_idempotency`/);
    expect(sql).not.toMatch(/ALTER TABLE `cashier_order_handoffs`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
  });

  it("0102 is additive order.create submission idempotency and is not a financial rewrite", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0102_order_create_idempotency.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `order_create_idempotency`");
    expect(sql).toContain("PRIMARY KEY (`restaurantId`, `submissionId`)");
    expect(sql).toContain("KEY `order_create_idempotency_order` (`orderId`)");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/ALTER TABLE `operational_checks`/);
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `cashier_invoices`/);
    expect(sql).not.toMatch(/ALTER TABLE `pos_sale_idempotency`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/FOREIGN KEY/i);
  });

  it("0093 is additive POS sale idempotency map and is not a POS Order table", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0093_pos_sale_idempotency.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `pos_sale_idempotency`");
    expect(sql).toContain("pos_sale_idempotency_unique");
    expect(sql).not.toMatch(/CREATE TABLE `pos_sales`/);
    expect(sql).not.toMatch(/CREATE TABLE `pos_orders`/);
    expect(sql).not.toMatch(/CREATE TABLE `pos_order_lines`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+/i);
    expect(sql).not.toMatch(/DELETE\s+/i);
    expect(sql).not.toMatch(/DROP\s+/i);
  });

  it("0092 is additive POS grant table and is not restaurant RBAC", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0092_pos_permission_grants.sql"),
      "utf8"
    );
    expect(sql).toContain("CREATE TABLE `pos_permission_grants`");
    expect(sql).toContain("pos_permission_grants_unique");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/UPDATE\s+/i);
    expect(sql).not.toMatch(/DELETE\s+/i);
    expect(sql).not.toMatch(/DROP\s+/i);
    expect(sql).not.toMatch(/CREATE TABLE `users`/);
    expect(sql).not.toMatch(/CREATE TABLE `roles`/);
    expect(sql).not.toMatch(/ALTER TABLE `pos_terminals`/);
  });

  it("0088 validates conversion before dropping integer planId", () => {
    const sql = readFileSync(
      join(repoRoot, "drizzle/0088_user_subscriptions_live_plan_identity.sql"),
      "utf8"
    );
    const gate = sql.indexOf("INSERT INTO `_0088_live_plan_identity_gate` (`ok`)\nSELECT 1");
    const drop = sql.indexOf("ALTER TABLE `user_subscriptions` DROP COLUMN `planId`");
    expect(gate).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(gate);
  });

  it("recovery execute delegates to phased orchestrator (no bulk migrate)", () => {
    const execute = readFileSync(
      join(repoRoot, "scripts/recovery/migration-0054-0057-execute.mjs"),
      "utf8"
    );
    expect(execute).not.toMatch(/spawnSync\([^)]*drizzle-kit/);
    expect(execute).toContain("phased-execute");
  });
});
