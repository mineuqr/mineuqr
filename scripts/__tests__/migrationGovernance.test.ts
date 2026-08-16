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
  it("journal contains canonical migrations 0000–0093 contiguously", () => {
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
    expect(journal.entries[93]?.tag).toBe(CANONICAL_MIGRATION_TAIL_TAG);
    expect(validateJournalOrdering()).toEqual([]);
  });

  it("exports certified migration tail constant", () => {
    expect(CANONICAL_MIGRATION_TAIL_TAG).toBe("0093_pos_sale_idempotency");
    expect(CANONICAL_JOURNAL_ENTRY_COUNT).toBe(94);
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
