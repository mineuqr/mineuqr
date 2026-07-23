# SETTLEMENT-RECORD-IMPLEMENTATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-RECORD-IMPLEMENTATION-1 |
| **Phase** | Implementation (Write Side) |
| **Date** | 2026-07-23 |
| **Constitutional ADR** | [ADR-ARCH-026 — Settlement Record Platform](../../architecture/adrs/ADR-ARCH-026-settlement-record-platform.md) |
| **Reference design** | [SETTLEMENT-RECORD-PLATFORM-1/ARCHITECTURE.md](../SETTLEMENT-RECORD-PLATFORM-1/ARCHITECTURE.md) |
| **Verdict** | **IMPLEMENTATION COMPLETE** |

---

## Executive Summary

Settlement Record write-side is implemented exactly as ADR-ARCH-026 requires:

- Check remains the sole Monetary Aggregate Root and Financial Producer.
- Settlement Record is an immutable Canonical Financial Document (not an Aggregate Root).
- Money values are copied from the finalized Check freeze — never calculated.
- Records are append-only; UPDATE/DELETE are forbidden in repository + domain.
- Creation runs inside `finalizeOpenCheckById`’s Check-owned transaction (SR-INV-04).
- Uniqueness `(restaurantId, checkId, recordKind, recordGeneration)` + `already_applied` guarantees exactly-once publication (SR-INV-05).
- Reporting / Dashboard / Revenue consumers are **unchanged** (Phase A introduce only).

---

## Architecture Compliance

| ADR-ARCH-026 rule | Implementation evidence |
|-------------------|-------------------------|
| Check sole monetary Aggregate Root | No monetary decisions on Settlement Record; CheckService remains finalize authority |
| Not an Aggregate Root | Domain barrel + contract explicitly state Immutable Document / NOT Aggregate Root |
| Never calculate money (SR-INV-01) | `buildSettlementRecordSnapshot` / `createSettlementRecord` copy strings only; architecture guard forbids `computeCheckMoney` in domain |
| Append-only (SR-INV-02) | Repository exposes insert/find only; `updateSettlementRecord` / `deleteSettlementRecord` throw |
| Atomic with Check finalize (SR-INV-04) | `createSettlementRecordForCheckFinalize` called inside `withCheckOwnedTransaction` after ST + OS |
| Exactly one per settlement generation (SR-INV-05) | Unique index + pre-check + DUPLICATE → `already_applied` |
| Historical truth forever (SR-INV-06/08) | Embedded currency/tax/payment/businessDay snapshots at create |
| Tenant isolation (SR-INV-07) | `restaurantId` on every row and every query predicate |
| Reporting unchanged | No Reporting adapters modified |

---

## Files Changed

### Domain (shared)

- `shared/operational-session/check/settlementRecord/settlementRecordContract.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordErrors.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordIdentity.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordInvariants.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordSnapshot.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordEvents.ts`
- `shared/operational-session/check/settlementRecord/settlementRecordCommands.ts`
- `shared/operational-session/check/settlementRecord/index.ts`
- `shared/operational-session/check/index.ts` (exports)
- `shared/operational-session/index.ts` (exports)

### Persistence / Integration (server)

- `drizzle/0076_settlement_records.sql`
- `drizzle/schema.ts` (`settlementRecords`)
- `drizzle/meta/_journal.json`
- `scripts/lib/migration-governance-lib.cjs` (tail → `0076_settlement_records`)
- `scripts/migration-governance-guard.cjs`
- `server/operational-session/check/settlementRecordMapper.ts`
- `server/operational-session/check/settlementRecordRepository.ts`
- `server/operational-session/check/checkSettlementRecordIntegration.ts`
- `server/operational-session/check/CheckService.ts` (atomic create in finalize)
- `server/operational-session/check/index.ts` (exports)

### Tests

- `shared/operational-session/check/settlementRecord/__tests__/settlementRecordCommands.test.ts`
- `shared/operational-session/__tests__/settlementRecordDomain.architecture.guards.test.ts`
- `shared/operational-session/__tests__/settlementRecordMigration.architecture.guards.test.ts`
- `server/operational-session/check/__tests__/settlementRecordRepository.test.ts`
- `server/operational-session/check/__tests__/checkSettlementRecordIntegration.test.ts`
- Updated CheckService / Session tests to mock Settlement Record integration where needed

### Docs / Registry

- `docs/engineering/programs/SETTLEMENT-RECORD-IMPLEMENTATION-1/IMPLEMENTATION.md` (this file)
- ADR-ARCH-026 implementation status note
- ADR-Registry implementation status → Partial (write-side)

---

## Database

### Migration

`drizzle/0076_settlement_records.sql`

- Production-safe additive `CREATE TABLE`
- No destructive changes
- No foreign keys (application-level integrity, matches OS/ST/MCA)
- No `ON UPDATE CURRENT_TIMESTAMP` (immutability signal)

### Schema highlights

| Concern | Implementation |
|---------|----------------|
| Identity | `settlementRecordId` (unique opaque domain id) |
| Business uniqueness | UNIQUE `(restaurantId, checkId, recordKind, recordGeneration)` |
| Money | `subtotal`, `discountAmount`, `taxAmount`, `grandTotal` (decimal copies) |
| Snapshots | `currencySnapshotJson`, `taxPolicySnapshotJson`, `taxBreakdownJson`, `paymentSnapshotJson` |
| Correlation | `checkId`, `sessionId`, `orderRefsJson`, `orderSettlementRefsJson`, `financialReference`, `priorSettlementRecordId` |
| Business day | `businessDay` VARCHAR(10) frozen at create |
| Audit | `createdAt`, actor fields, `producer='check_aggregate'`, `schemaVersion` |

### Indexes

- Unique: record id, business key
- Lookup: restaurant, check, restaurant+check, session, businessDay, financialReference, prior id, outcome, recordKind

---

## Domain

| Component | Role |
|-----------|------|
| Contract | Document shape, kinds, producer constant |
| Identity | Deterministic `sr:{restaurant}:{check}:{kind}:{gen}`, claim keys |
| Invariants | SR-INV-01…08 enforcement / append-only / tenant / monetary consistency compare |
| Snapshot builder | Copy-only freeze assembly |
| Commands | `createSettlementRecord`, `createCompensatingSettlementRecord` → `applied` \| `already_applied` |
| Events | `SettlementRecordCreated` (+ future refund/void/corrected types declared) |

Lifecycle: Create inside Check finalize → Publication after commit → Consumption later by Reporting adoption → Corrections via compensating appends only.

---

## Persistence

| API | Behavior |
|-----|----------|
| `insertSettlementRecord` | Append-only insert; DUPLICATE → typed error |
| `findSettlementRecordById` / `ByIdentity` | Tenant-scoped lookup |
| `existsSettlementRecord` | Existence verification |
| `listSettlementRecordsForCheck` / `Restaurant` / `Session` | Internal retrieval |
| `updateSettlementRecord` / `deleteSettlementRecord` | Always throw (SR-INV-02) |

Transactions: repository accepts optional `SessionDbClient` and joins Check-owned TX (no nested ownership).

---

## Events

| Event | Status | Publisher | Notes |
|-------|--------|-----------|-------|
| `SettlementRecordCreated` | Implemented | Check Aggregate (collected) | Deterministic `claimKey`; replay-safe; no outbox in v1 |
| `SettlementRecordRefunded` | Type reserved | — | Future compensating programs |
| `SettlementRecordVoided` | Type reserved | — | Future compensating programs |
| `SettlementRecordCorrected` | Type reserved | — | Future compensating programs |

Returned on `CheckFinancialMutationResult.settlementRecordEvents`.

---

## APIs

Internal only (no public Reporting APIs):

- `createSettlementRecordForCheckFinalize` — sole producer path
- `settlementRecordExistsForCheck` — existence helper
- Repository read helpers for future projection/API programs

**Not implemented (explicitly out of scope):** Reporting adapters, Dashboard, Excel/PDF, public `settlementRecord.*` tRPC.

---

## Tests

### Executed (all passed)

| Suite | Coverage |
|-------|----------|
| `settlementRecordCommands.test.ts` | Domain create, copy money, idempotency, void kind, compensating refund, append-only, businessDay freeze |
| `settlementRecordDomain.architecture.guards.test.ts` | Boundary / no drizzle / CheckService TX hook |
| `settlementRecordMigration.architecture.guards.test.ts` | SQL uniqueness, schema, journal, governance tail |
| `settlementRecordRepository.test.ts` | Insert, DUPLICATE, tenant find/exists, forbid update/delete |
| `checkSettlementRecordIntegration.test.ts` | Apply, already_applied, concurrent DUPLICATE, failure propagation |
| `CheckService.orderSettlementIntegration.test.ts` | Atomic create call + SR failure rollback + OS failure before SR |
| CheckService m3/m4/m5 + sessionActions | Regression with Settlement Record mocks |

Governance: `node scripts/migration-governance-guard.cjs` → **OK** (tail `0076_settlement_records`, 77 entries).

---

## Validation

| Requirement | Result |
|-------------|--------|
| Atomicity | SR create inside same `withCheckOwnedTransaction`; insert failure rejects finalize |
| Idempotency | Pre-read + unique index + DUPLICATE → `already_applied` |
| Financial consistency | Domain compares copied money to Check freeze; mismatch throws |
| Tenant isolation | All queries include `restaurantId`; identity builder embeds tenant |
| Immutability | No money UPDATE path; compensating records for corrections |
| Reporting unchanged | No Reporting files modified |

---

## Risks

| Risk | Mitigation / Future work |
|------|--------------------------|
| Business day freeze uses timestamp date prefix (not opening-hours resolver) | Stored forever; can pass explicit `businessDay` later without rewriting history |
| Compensating refund/void/correction create path is domain-ready but not yet wired to Check refund workflows | Successor program |
| No public read API / projection yet | SETTLEMENT-RECORD-PROJECTION-1 / API-1 |
| Reporting still reads Check/ST | SETTLEMENT-RECORD-REPORTING-ADOPTION-1 (dual-run → parity → cutover) |
| Concurrent double-finalize of Check still relies on `outcome='open'` WHERE (pre-existing) | Unique Settlement Record key prevents duplicate publication |

---

## Future work

1. SETTLEMENT-RECORD-PROJECTION-1 / API-1 — read models + internal/public reads  
2. Wire compensating Settlement Records into refund/void correction workflows  
3. SETTLEMENT-RECORD-REPORTING-ADOPTION-1 — dual-run / parity / cutover  
4. Optional opening-hours-aware `businessDay` freeze at finalize (still copy-once)

---

# IMPLEMENTATION COMPLETE

Write-side Settlement Record Platform is implemented, validated, tested, and documented under ADR-ARCH-026. Reporting behavior is unchanged by design.
