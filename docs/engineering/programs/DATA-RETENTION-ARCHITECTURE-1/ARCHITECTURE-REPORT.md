# DATA-RETENTION-ARCHITECTURE-1 — Architecture Report

| Field | Value |
|---|---|
| **Program** | DATA-RETENTION-ARCHITECTURE-1 |
| **Type** | Architecture Investigation & Design (read-only) |
| **Status** | COMPLETE |
| **Date** | 2026-07-25 |
| **ADR** | [ADR-ARCH-031](../../architecture/adrs/ADR-ARCH-031-data-retention-and-archival-platform.md) |
| **First adopter (future)** | Financial Shift (CRMP) — adoption only; not implemented here |
| **STOP conditions** | **Not triggered** — centralized retention can coexist with aggregate ownership if Archive is not a second SSOT and Permanent classes (esp. Settlement Records) are never purged by default |

---

## 1. Executive Summary

MineuQR today has **fragmented soft-lifecycle signals** (Financial Shift `archived` / `archivedAt`, Register `archivedAt`, Order `lifecycleStage=archived`) and **strong immutability islands** (Settlement Records, MCA history), but **no platform-wide retention, cold archive, or purge authority**.

This program designs the **Data Retention & Archival Platform (DRAP)** as the **single governance authority** for:

1. **Display Window** — what operators see by default  
2. **Operational Retention** — hot/warm operational store eligibility  
3. **Cold Archive** — immutable offline-of-hot storage with restore  
4. **Final Deletion** — optional, policy-gated purge  

**Domains MUST NOT invent independent retention policies.** Domain aggregates remain the **source of truth for business meaning**; DRAP owns **lifecycle eligibility, policy evaluation, archive orchestration, and purge authorization**.

Financial Shift is the **first planned adopter**, not a one-off policy silo.

**This program performs no implementation, migrations, or API changes.**

---

## 2. Current State Matrix

| Domain | Ownership / AR | Write model | Read model | Reporting deps | Delete today | Archive today | Lifecycle today |
|--------|----------------|-------------|------------|----------------|--------------|---------------|-----------------|
| **Financial Shift** | CRMP / Financial Shift AR | `crmp_financial_shifts` + drawer/handover/attribution children | Ops history refs; tender compose | Attribution → Settlement Record snapshots | No hard delete; child rewrite on save | Domain `archive` (`closed`→`archived` + `archivedAt`); **no Ops API** yet | open → … → closed → archived (ADR-030) |
| **Register (Catalog)** | CRMP / Register AR | `crmp_registers` | Catalog list (filters `archivedAt`) | — | Soft archive only | `archivedAt` + inactive | provisioned/active/inactive + soft archive |
| **Register Duty** | Register Ops on Register | duty fields on register | Ops current/list | — | Blocked by open duty/shift rules | N/A (duty closes) | closed/open/suspended |
| **Settlement Record** | Check-published document (ADR-026) | `settlement_records` append-only | Reporting adapters | **Canonical financial publication** | **Forbidden** (SR-INV) | None (lives forever in hot DB today) | Immutable after publish |
| **Check / OS** | Check AR (ADR-020/022) | `operational_checks` + membership/TX | Ops UI / settlement | Feeds Settlement Record | Terminal via outcome; no `deletedAt` | None | open → settled/voided… |
| **Order Settlement** | Check-owned entity | `check_order_settlements` | — | History retained | Hard delete not provided (ADR-022) | None | Terminal retained |
| **Orders** | Order AR | `orders` | `order_read_*` | KPI/analytics projections | No `deletedAt` | `lifecycleStage=archived` | active → completed → archived |
| **Dining Sessions** | Session | `dining_sessions` | Ops | Settlement context | Status/timestamps close | None | open → paid/closed… |
| **Audit Events** | Platform audit | `audit_events` | Admin/forensics | Compliance | None | None | Append-only; **no restaurantId** |
| **Notifications** | Subscriptions / messaging | `renewal_notifications`, push subs | Inbox | — | Cascade / hard delete (push) | `expiresAt` on push | Transient + TTL credentials |
| **Reporting** | Reporting Platform (read) | Live reads + daily projections | Dashboard/reporting | Settlement Record / checks | Projection rewrite | No cold archive | Derived, rebuildable |
| **Kitchen History** | No dedicated kitchen log table | Device role + order events | KDS presentation | — | N/A | N/A | Event-derived / ephemeral UI |
| **Print / Device Logs** | Printing / Devices | `print_jobs*`, `print_job_history`, devices/tokens | Print workspace | — | Device hard delete; telemetry tables historically dropped | Token `expiresAt`/`revokedAt` | Operational + credential TTL |
| **Table Events** | Table ops | `table_events` | — | — | Cascade incomplete | None | Append operational log |
| **Outbox** | Order events | `order_domain_outbox` | Relay | — | No purge policy found | None | pending/published/failed |
| **Restaurant wipe** | Admin cascade | `deleteRestaurantCascadeTx` | — | — | Hard delete subset of tables | Incomplete vs CRMP/FSP | Tenant destruction ≠ retention |

**Findings**

1. Soft archive ≠ retention platform (no display window, cold store, timed purge).  
2. Settlement Records are **permanently retained by invariant** — DRAP must treat as **Permanent** unless legal authority + Super Admin override.  
3. Restaurant cascade is **not** a retention design and is incomplete for modern CRMP/FSP tables.  
4. No scheduled retention jobs exist.

---

## 3. Data Classification Matrix

| Class | Meaning | Examples | Justification |
|-------|---------|----------|---------------|
| **Permanent** | Must not be purged by ordinary policy; legal/financial integrity | Settlement Records; MCA allocation history; critical audit of financial publication; tax-relevant published documents | ADR-026 immutability; fiscal/dispute reconstruction |
| **Operational** | Hot path for day-to-day Ops | Open/closed Financial Shifts in display window; open Checks/Orders; active Registers; current print jobs | Required for live restaurant operations |
| **Historical** | Past operational accountability, still valuable warm | Closed Financial Shifts outside display window; completed Orders; closed sessions; print job history | Needed for Ops history / coaching / short disputes; eligible for archive after policy |
| **Transient** | Short-lived process state | Outbox pending rows; pairing tokens; device activation codes; unread notification flags | Safe to expire/purge after success windows |
| **Ephemeral** | Not a system of record | KDS on-screen queues; UI caches; preview VMs; connector local buffers | Rebuilt from events/read models; never archived as SSOT |

**Classification rules**

- Money **publication** → Permanent (or legal-hold Permanent).  
- Money **operational accountability** (Financial Shift drawer facts) → Operational → Historical → Archive (metadata + graph).  
- Derived reporting projections → Transient/rebuildable (not cold-archive SSOT).  
- Credentials/tokens → Transient with TTL (existing pattern; remain owned by auth/device modules but **policy windows** may be registered with DRAP later).

---

## 4. Canonical Lifecycle

```text
Active
  → Operational Retention   (still in primary DB; may leave default Display Window)
  → Cold Archive            (immutable archive package; hot row tombstoned or hidden)
  → Restorable Archive      (same package; restore allowed under policy)
  → Permanent Deletion      (optional; only if policy + legal allow)
```

### Stages

| Stage | Definition | Store |
|-------|------------|-------|
| **Active** | Subject participates in live operations | Primary OLTP |
| **Operational Retention** | Closed/terminal for ops; still in primary DB; may be outside UI Display Window | Primary OLTP |
| **Cold Archive** | Exported immutable package + catalog metadata; removed or sealed from hot operational queries | Archive store + Archive Catalog |
| **Restorable Archive** | Cold Archive that policy still allows to restore | Archive store |
| **Permanent Deletion** | Archive package + catalog entry destroyed (or never archived, hard-purged from hot under exceptional policy) | None |

### Allowed transitions

| From | To | Trigger |
|------|----|---------|
| Active | Operational Retention | Domain terminalization (e.g. Shift closed, Order completed) — **domain owns meaning**; DRAP observes eligibility |
| Operational Retention | Cold Archive | Auto/manual archive when Archive Retention clock / policy met |
| Cold Archive | Restorable Archive | Implicit while restore window open (may be same physical stage with flag) |
| Restorable Archive | Active/Operational | **Restore** (creates controlled rehydration; auditable) |
| Restorable Archive | Permanent Deletion | Auto/manual purge when Deletion Policy allows |
| Operational Retention | Permanent Deletion | Only if Archive skipped **and** policy explicitly allows hot purge (default: **forbidden** for Historical financial-adjacent) |

### Terminal states

- **Permanent** class subjects: terminal = retain forever (or legal hold); purge transition **disabled** by default.  
- **Restorable Archive** expires → **Permanent Deletion** or **Legal Hold** (non-deletable archive).  
- Domain soft-archive flags (e.g. Shift `archived`) are **eligibility signals**, not DRAP completion.

### Restoration rules

1. Restore is a **DRAP command**, not a domain inventing re-open of terminal business meaning without policy.  
2. Restore **rehydrates** into primary DB under original `restaurantId` (tenant-safe).  
3. Restore MUST emit audit event; MUST be idempotent for the same archive package id.  
4. Restore MUST NOT rewrite Settlement Records or create a second financial SSOT.  
5. Financial Shift restore returns history visibility / accountability graph; it does **not** reopen money settlement.

---

## 5. Retention Policy Architecture

### Canonical policy object (logical)

```text
RetentionPolicy {
  policyId
  scope: GlobalDefault | RestaurantOverride
  subjectType: FinancialShift | Order | … | AuditEventBundle
  enabled: boolean

  displayWindow: Duration        // Ops default visibility
  operationalRetention: Duration // remain in primary DB
  archiveRetention: Duration     // remain restorable in cold archive
  deletionPolicy: Never | AfterArchiveRetention | ManualOnly | LegalHold

  autoArchive: boolean
  manualArchive: boolean
  autoPurge: boolean
  manualPurge: boolean

  inheritance: InheritGlobal | OverrideRestaurant | Future: Brand/Org
}
```

### Capability mapping

| Capability | Meaning |
|------------|---------|
| Display Window | UI/API default list filter (e.g. last 90 days of closed shifts) |
| Operational Retention | Hot DB keep window before archive eligibility |
| Archive Retention | Cold keep / restore window |
| Deletion Policy | Whether purge exists; Never for Permanent class |
| Auto/Manual Archive | Scheduler vs operator/admin action |
| Auto/Manual Purge | Scheduler vs Super Admin action |
| Enabled/Disabled | Kill switch per subject type |
| Per Restaurant overrides | Narrower display or longer retain; **cannot weaken Permanent/legal floors** |
| Global defaults | Platform baseline |
| Future inheritance | Brand → Restaurant (not designed in detail here) |

### Evaluation authority

- **DRAP Policy Engine** evaluates clocks and eligibility.  
- **Domain services** remain owners of aggregate commands (`close`, domain soft-archive).  
- Domains **register** subject types and provide **export/rehydrate ports**; they do **not** store competing retention durations.

---

## 6. Archive Platform Architecture

### Components (logical)

| Component | Responsibility |
|-----------|----------------|
| **Archive Catalog** | Metadata index: `archiveId`, `restaurantId`, `subjectType`, `subjectId`, `contentHash`, `archivedAt`, `restoreUntil`, `legalHold`, `status` |
| **Archive Packager** | Domain port builds immutable package (JSON/blob) of subject graph |
| **Cold Store** | Blob/object or sealed DB schema — not queryable as Ops SSOT |
| **Archive Index** | Search by restaurant, type, date, subject id (metadata only) |
| **Restore Orchestrator** | Validates policy + permissions; rehydrates via domain port; audits |
| **Purge Orchestrator** | Validates deletion policy + legal hold; destroys package; audits |

### Storage ownership

- Cold Store and Catalog are **platform-owned** (DRAP).  
- Package **payload schema** versioned per `subjectType` by domain collaboration.  
- Hot OLTP remains domain-owned tables.

### Compression / indexing / search

- Packages MAY be compressed; Catalog remains uncompressed metadata.  
- Search is **Catalog/metadata search**, not ad-hoc SQL against cold blobs as SSOT.  
- Full-text inside packages is optional Phase-2.

### Immutability & auditability

- Package bytes + `contentHash` are immutable after seal.  
- Any restore/purge attempt logged to audit (and preferably append-only DRAP audit trail).  
- Archive MUST NOT be updated in place; correction = new package + supersession metadata (rare; financial packages prefer legal hold).

### Referential integrity

- Package MUST include enough graph to restore without dangling required children (e.g. Shift + drawer movements + attributions **references**).  
- Foreign subjects (Settlement Record ids) remain **references**, not copied financial SSOT — restore must tolerate SR still Permanent in hot DB.

---

## 7. Domain Adoption Matrix

| Domain | Adoption | Why |
|--------|----------|-----|
| **Financial Shift** | **Supported (first adopter)** | Explicit soft-archive already; history UX need; accountability closed periods; ADR-030 `archived` aligns |
| **Register Catalog soft-archive** | **Supported (phase 2)** | Already `archivedAt`; map Display/Operational; careful with referential use by Shift |
| **Orders (`lifecycleStage`)** | **Supported (phase 2)** | Existing archived stage; unify display window; cold archive optional |
| **Checks / Sessions** | **Deferred** | Bound to Settlement Record publication; archive only after settlement terminal + legal review |
| **Settlement Records** | **Never (default purge)** / **Supported (legal-hold archive copy only)** | Purge forbidden by ADR-026; optional **mirror** cold legal export without removing hot SSOT |
| **Reporting projections** | **Never (as archive SSOT)** | Rebuildable; purge/rebuild OK as Transient |
| **Audit Events** | **Deferred** | Needs tenant binding + compliance design first (`restaurantId` gap) |
| **Notifications** | **Supported (light)** | Transient; TTL/purge; no cold archive required |
| **Kitchen History** | **Deferred / Never as table** | No durable kitchen history aggregate today; adopt when kitchen event store exists |
| **Device / Print logs** | **Supported (phase 3)** | Operational logs; aggressive operational retention; cold optional |
| **Outbox / tokens** | **Supported (Transient policies)** | Expire/purge; not cold archive |
| **Customer activity / push** | **Deferred** | Privacy + TTL; separate privacy program may lead |

---

## 8. Governance Model

| Question | Answer |
|----------|--------|
| Who owns retention? | **Architecture Authority** owns DRAP constitution; **Platform Engineering** owns DRAP runtime; domains own export/rehydrate ports |
| Who initiates archive? | Auto scheduler (DRAP) and/or Restaurant Admin (manual) per policy; domain may emit *eligibility* events only |
| Who initiates purge? | Auto only if policy allows; **Manual purge requires Super Admin** for Historical/Financial-adjacent |
| Can domains override policy? | **No** duration/ownership override. Domains may only declare class constraints (e.g. Permanent) |
| Can restaurants customize? | **Yes** within floors/ceilings (longer retain OK; shorter than legal floor **No**) |
| Super Admin required? | Enable purge; legal hold; cross-tenant emergency; bypass display for compliance export |

### Boundaries

- DRAP does **not** become Monetary Aggregate Root.  
- DRAP does **not** settle, reprice, or rewrite Settlement Records.  
- UI Display Window ≠ deletion.  
- Domain soft-archive command ≠ Cold Archive completion (may be a prerequisite signal).

---

## 9. Security Review

| Concern | Finding / Control |
|---------|-------------------|
| Legal deletion | Deletion Policy + Legal Hold; Permanent class default Never |
| Audit preservation | Archive/restore/purge must write audit; audit store itself deferred for DRAP adoption |
| Financial preservation | Settlement Records never auto-purged; Shift archive packages reference SR ids |
| Referential integrity | Packager contracts + restore validation; fail closed if graph incomplete |
| Restoration permissions | Restaurant Admin (own tenant) within policy; Super Admin for cross-policy |
| Archive permissions | Restaurant Admin manual archive if enabled; scheduler service identity |
| Purge permissions | Super Admin (+ dual control recommended for Permanent exceptions) |
| Cross-tenant safety | Catalog and Cold Store keyed by `restaurantId`; no cross-tenant restore |

---

## 10. Performance Review

| Area | Impact | Mitigation |
|------|--------|------------|
| DB size | Growth of Shift/Order/print history | Display Window + archive moves closed graphs out of hot indexes |
| Indexes | Hot tables stay leaner | Partial indexes on non-archived / in-window columns (future impl) |
| Queries | Ops lists must filter Display Window | Default predicates in read APIs (adopter programs) |
| Reporting | Must not depend on purged hot history | Reporting reads Settlement Records / projections; archive is not reporting SSOT |
| Dashboard | Same as Ops display window | Projection tables remain rebuildable |
| Search | Catalog search for archive; hot search for operational | Split search surfaces |
| Backups / DR | Cold Store in backup scope; restore runbooks | Treat Archive Catalog as critical config data |

---

## 11. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Domains keep inventing local retention | High | ADR invariants DR-02/DR-09; architecture guards in impl programs |
| Archive becomes second SSOT | High | DR-04; reporting forbidden from cold blobs as money truth |
| Purging Settlement Records | Critical | Class Permanent; deletionPolicy=Never |
| Incomplete restaurant cascade confused with retention | Medium | Separate Tenant Destruction program; do not reuse cascade |
| Audit events lack restaurantId | Medium | Fix before Audit adoption |
| Shift archive API missing while domain exists | Low (for this design) | First adopter implementation program wires DRAP + Ops |
| Restore reopens closed money periods incorrectly | High | Restore ≠ reopen settle; explicit domain port semantics |

---

## 12. ADR

Published: **[ADR-ARCH-031 — Data Retention & Archival Platform](../../architecture/adrs/ADR-ARCH-031-data-retention-and-archival-platform.md)**  
Status: **Accepted (governance)** — **Not implemented**.

---

## 13. Production Readiness Assessment

| Item | Status |
|------|--------|
| Architecture design complete | Yes |
| STOP conditions | Not triggered |
| Runtime DRAP | **Not built** |
| Schema for Archive Catalog / Cold Store | **Not created** (forbidden in this program) |
| Financial Shift adoption | Design-ready as first adopter; requires successor program |
| Safe to enable purge in production today | **No** |

---

## 14. Recommended Implementation Roadmap

| Phase | Program (suggested) | Scope |
|-------|---------------------|-------|
| **R0** | DATA-RETENTION-ARCHITECTURE-1 | **This report + ADR-031** (done) |
| **R1** | DATA-RETENTION-PLATFORM-FOUNDATION-1 | Archive Catalog schema, policy tables, engine skeleton, permissions — **no domain purge** |
| **R2** | FINANCIAL-SHIFT-RETENTION-ADOPTION-1 | Display Window for Shift history; map ADR-030 `archived` to Operational Retention; package export port; manual archive |
| **R3** | DATA-RETENTION-COLD-STORE-1 | Cold Store + auto archive job + restore MVP |
| **R4** | ORDER-RETENTION-ADOPTION-1 | Align Order `lifecycleStage` with Display Window |
| **R5** | OPERATIONAL-LOGS-RETENTION-1 | Print/device/outbox Transient policies |
| **R6** | AUDIT-RETENTION-ADOPTION-1 | After tenant-binding hardening |
| **Rx** | LEGAL-HOLD-AND-PURGE-1 | Purge enablement only after compliance sign-off |

---

## Required Invariants (expanded)

| ID | Invariant |
|----|-----------|
| **DR-01** | Every persisted record (subject) belongs to exactly one retention policy binding (type+scope). |
| **DR-02** | Domains MUST NOT implement independent retention mechanisms (durations, purge jobs, cold stores). |
| **DR-03** | Archive MUST preserve referential integrity of the packaged graph. |
| **DR-04** | Archive MUST NOT become a second source of truth for money or operational commands. |
| **DR-05** | Archived packages MUST remain immutable (content-addressed). |
| **DR-06** | Restoration MUST be auditable. |
| **DR-07** | Purge MUST respect legal and financial preservation (Permanent / Legal Hold). |
| **DR-08** | Tenant isolation MUST remain intact in every lifecycle stage. |
| **DR-09** | Retention policies MUST be centrally managed by DRAP. |
| **DR-10** | Archive and purge operations MUST be idempotent. |
| **DR-11** | Display Window MUST NOT delete data. |
| **DR-12** | Settlement Records default deletionPolicy = Never. |
| **DR-13** | Domain soft-archive ≠ Cold Archive completion unless DRAP confirms package seal. |
| **DR-14** | Restore MUST NOT fabricate Register/Shift/Check context beyond rehydrated facts. |

---

## STOP Conditions Assessment

| Risk to | Assessment |
|---------|------------|
| Aggregate ownership | **Safe** if DRAP orchestrates only; domains keep ARs |
| Source of Truth | **Safe** if Archive ≠ SSOT (DR-04) |
| Referential integrity | **Safe** with packager contracts |
| Multi-tenant isolation | **Safe** with restaurant-scoped catalog/store |
| Financial data integrity | **Safe** if Settlement Records Permanent |
| Reporting architecture | **Safe** if reporting continues on Settlement Records / projections |

**STOP not triggered.** Implementation remains unauthorized until successor programs.

---

*End of DATA-RETENTION-ARCHITECTURE-1 Architecture Report.*
