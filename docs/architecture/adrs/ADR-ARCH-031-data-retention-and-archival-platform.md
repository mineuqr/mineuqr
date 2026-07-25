# ADR-ARCH-031: Data Retention & Archival Platform

> [← ADR-ARCH-030](./ADR-ARCH-030-financial-shift-operational-lifecycle.md) · [← ADR-ARCH-028](./ADR-ARCH-028-cash-register-management-platform.md) · [← ADR-ARCH-026](./ADR-ARCH-026-settlement-record-platform.md) · [← ADR-ARCH-002](./ADR-ARCH-002.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted (governance) |
| **Owner** | Architecture Authority |
| **Program** | DATA-RETENTION-ARCHITECTURE-1 |
| **Date** | 2026-07-25 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | Cross-cutting lifecycle of persisted subjects; does **not** move Aggregate ownership |
| **Does not modify** | ADR-ARCH-020 · 022 · 026 · 028 · 030 ownership or monetary SSOT |
| **Related programs** | DATA-RETENTION-ARCHITECTURE-1 · (future) FINANCIAL-SHIFT-RETENTION-ADOPTION-1 · DATA-RETENTION-PLATFORM-FOUNDATION-1 |
| **Implementation status** | **Not implemented** — constitutional governance + architecture design only |

---

## Context

MineuQR accumulated **per-domain soft lifecycle signals** (Financial Shift `archived`, Register `archivedAt`, Order `lifecycleStage=archived`) and **immutable financial publication** (Settlement Records) without a **central retention authority**.

A Financial Shift history need correctly identified the gap, but solving it with a Shift-only retention policy would create another silo and invite Orders, logs, and notifications to invent incompatible purge rules.

Forces:

- Operators need bounded **Display Windows** without destroying accountability.  
- Databases will grow without **Operational Retention → Cold Archive**.  
- Settlement Records and legal evidence must **never** be casually purged (ADR-026).  
- Aggregate ownership (Check / CRMP / Order) must remain intact (ADR-002 / 020 / 028).  
- Multi-tenant isolation must hold across archive and restore.

### Explicit non-goals

- Implementing schema, APIs, jobs, UI, or migrations in this ADR  
- Creating a second monetary or reporting source of truth in cold storage  
- Authorizing Settlement Record deletion  
- Replacing domain soft-archive commands with DRAP-owned business meaning  

---

## Problem

Without a unified Data Retention & Archival Platform:

1. Each module may invent incompatible retention/deletion.  
2. Soft-archive flags are mistaken for cold archive or purge.  
3. Financial immutability and operational history cleanup collide.  
4. Future domains cannot adopt retention without redesign.

---

## Decision

**MineuQR SHALL introduce the Data Retention & Archival Platform (DRAP) as the single authority for Display Window, Operational Retention, Cold Archive, Restoration, and Purge policy evaluation and orchestration.**

1. Domains remain Aggregate owners and sources of business truth.  
2. Domains MUST NOT implement independent retention durations, cold stores, or purge schedulers.  
3. Domains MAY expose **export / rehydrate ports** and emit **eligibility signals** (including existing soft-archive states).  
4. Financial Shift is the **first planned adopter**; Settlement Records are **Permanent** (deletionPolicy = Never by default).  
5. Archive packages are **immutable** and **not** a second SSOT.  
6. Purge is optional, policy-gated, and Super-Admin controlled for financial-adjacent history.

Canonical lifecycle:

`Active → Operational Retention → Cold Archive / Restorable Archive → Permanent Deletion (optional)`

Invariants **DR-01 … DR-14** in the program Architecture Report are constitutional for DRAP adopters.

---

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Per-domain retention (Shift-only first) | Siloed policies; violates DR-02/DR-09; redesign for every domain |
| Hard delete after N days in hot DB only | Destroys restore/audit; unsafe for financial-adjacent graphs |
| Use restaurant cascade delete as retention | Incomplete coverage; tenant destruction ≠ lifecycle governance |
| Treat Settlement Records as archivable/purgeable | Violates ADR-026 / SR immutability |
| Cold archive as reporting SSOT | Violates ADR-002 / DR-04 |

---

## Trade-offs

| Positive | Negative |
|----------|----------|
| One governance model for all domains | Requires packager ports per adopter |
| Display Window without data loss | Ops APIs must learn default filters |
| Cold archive enables DB growth control | New platform surface (Catalog, Cold Store, jobs) |
| Permanent class protects money documents | Some tables never shrink via purge |
| Central policy + restaurant overrides | Override complexity and floor enforcement |

---

## Invariants (normative summary)

- **DR-01** One policy binding per persisted subject type/scope.  
- **DR-02** No independent domain retention mechanisms.  
- **DR-03** Archive preserves packaged referential integrity.  
- **DR-04** Archive is not a second source of truth.  
- **DR-05** Archived packages immutable.  
- **DR-06** Restore auditable.  
- **DR-07** Purge respects legal/financial preservation.  
- **DR-08** Tenant isolation at every stage.  
- **DR-09** Policies centrally managed.  
- **DR-10** Archive/purge idempotent.  
- **DR-11** Display Window ≠ deletion.  
- **DR-12** Settlement Records default Never delete.  
- **DR-13** Domain soft-archive ≠ Cold Archive completion.  
- **DR-14** Restore does not fabricate operational/financial context.

---

## Consequences

### Positive

- Future adopters plug into DRAP without redesigning retention.  
- Financial Shift history can gain Display Window + archive without a silo policy.  
- Clear Super Admin / Restaurant Admin boundaries for purge/restore.

### Negative / follow-ups

- Successor implementation programs required (Foundation → Shift adoption → Cold Store).  
- Audit Events need tenant-binding before Audit adoption.  
- Restaurant cascade delete remains a separate Tenant Destruction concern.

### Forbidden without successor authorization

- Schema for Archive Catalog / Cold Store  
- Purge jobs in production  
- API changes claiming retention completeness  

---

## Future Evolution

1. Foundation: policy store + catalog + engine.  
2. Financial Shift retention adoption (first).  
3. Orders / operational logs.  
4. Legal hold + controlled purge.  
5. Optional brand/org policy inheritance.

---

## Related Blueprint / Programs

- Program report: `docs/engineering/programs/DATA-RETENTION-ARCHITECTURE-1/ARCHITECTURE-REPORT.md`  
- ADR-ARCH-002 Single Source of Truth  
- ADR-ARCH-026 Settlement Record Platform  
- ADR-ARCH-028 CRMP  
- ADR-ARCH-030 Financial Shift Operational Lifecycle  

---

**Submit via:** [ADR Lifecycle](../governance/ADR-Lifecycle.md) · **Registry:** [ADR-Registry.md](../constitution/ADR-Registry.md)
