/**
 * MIGRATION-EXECUTION-ALIGNMENT-1 — certified operational recovery sequence.
 * Independent from journal idx order; uses journal only for `when` + hash metadata.
 */
const { hashMigrationSql, loadJournal } = require("./migration-governance-lib.cjs");

/** Authoritative production execution order (not journal idx order). */
const OPERATIONAL_MIGRATION_ORDER = [
  "0054_operational_devices",
  "0055_operational_device_screen_config",
  "0057_operational_device_screen_config_revision",
  "0056_order_read_category_projection",
];

const APPROVED_MIGRATION_TAGS = new Set(OPERATIONAL_MIGRATION_ORDER);

const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
const PRODUCTION_DB = "mineuqr";

const PACKAGE_CHECKSUM =
  "ab73dd34b3586faaafecc049bae6269958ab45ad97d0774f446c6f5e4d3fba90";

/**
 * @typedef {'migration' | 'backfill-verify' | 'smoke'} PhaseKind
 */

/**
 * @type {Array<{
 *   id: string;
 *   kind: PhaseKind;
 *   migrationTag?: string;
 *   label: string;
 *   prerequisites: string[];
 *   verify: import('./phased-recovery-engine.cjs').PhaseVerifySpec;
 *   backfillGate?: boolean;
 * }>}
 */
const RECOVERY_PHASES = [
  {
    id: "phase-1",
    kind: "migration",
    migrationTag: "0054_operational_devices",
    label: "Operational device registry (0054)",
    prerequisites: [],
    verify: {
      tables: ["operational_devices", "operational_device_tokens"],
      indexes: [
        ["operational_devices", "operational_devices_restaurant_status"],
        ["operational_devices", "operational_devices_restaurant_branch"],
        ["operational_device_tokens", "operational_device_tokens_device_status"],
      ],
    },
  },
  {
    id: "phase-2",
    kind: "migration",
    migrationTag: "0055_operational_device_screen_config",
    label: "Screen config column (0055)",
    prerequisites: ["phase-1"],
    verify: {
      columns: [["operational_devices", "screenConfig"]],
    },
  },
  {
    id: "phase-3",
    kind: "migration",
    migrationTag: "0057_operational_device_screen_config_revision",
    label: "Screen config revision (0057) — operational HTTP 500 recovery",
    prerequisites: ["phase-1", "phase-2"],
    verify: {
      columns: [
        ["operational_devices", "screenConfig"],
        ["operational_devices", "screenConfigRevision"],
      ],
    },
  },
  {
    id: "phase-4",
    kind: "migration",
    migrationTag: "0056_order_read_category_projection",
    label: "Category projection column (0056)",
    prerequisites: ["phase-1", "phase-2", "phase-3"],
    verify: {
      columns: [["order_read_order_line_items", "categoryProjection"]],
    },
    backfillGate: true,
  },
  {
    id: "phase-5",
    kind: "backfill-verify",
    label: "ORDER-READ-BACKFILL-1 integrity verification",
    prerequisites: ["phase-4"],
    verify: { backfillIntegrity: true },
  },
  {
    id: "phase-6",
    kind: "smoke",
    label: "Production smoke checklist",
    prerequisites: ["phase-5"],
    verify: { smokeChecklist: true },
  },
];

function getJournalWhen(tag) {
  const entry = loadJournal().entries.find((e) => e.tag === tag);
  if (!entry) {
    throw new Error(`Migration tag not in journal: ${tag}`);
  }
  return entry.when;
}

function getPhaseById(phaseId) {
  const phase = RECOVERY_PHASES.find((p) => p.id === phaseId);
  if (!phase) {
    throw new Error(`Unknown phase: ${phaseId}`);
  }
  return phase;
}

function resolvePhaseRunList({ phase, resumeFrom }) {
  const ids = RECOVERY_PHASES.map((p) => p.id);
  if (phase) {
    if (!ids.includes(phase)) {
      throw new Error(`Unknown --phase ${phase}`);
    }
    return RECOVERY_PHASES.filter((p) => p.id === phase);
  }
  if (resumeFrom) {
    const startIdx = ids.indexOf(resumeFrom);
    if (startIdx < 0) {
      throw new Error(`Unknown --resume-from ${resumeFrom}`);
    }
    return RECOVERY_PHASES.slice(startIdx);
  }
  return [...RECOVERY_PHASES];
}

function assertApprovedMigrationTag(tag) {
  if (!APPROVED_MIGRATION_TAGS.has(tag)) {
    throw new Error(`Refusing to execute unapproved migration tag: ${tag}`);
  }
}

module.exports = {
  APPROVED_MIGRATION_TAGS,
  OPERATIONAL_MIGRATION_ORDER,
  PACKAGE_CHECKSUM,
  PRODUCTION_DB,
  PRODUCTION_HOST,
  RECOVERY_PHASES,
  assertApprovedMigrationTag,
  getJournalWhen,
  getPhaseById,
  hashMigrationSql,
  resolvePhaseRunList,
};
