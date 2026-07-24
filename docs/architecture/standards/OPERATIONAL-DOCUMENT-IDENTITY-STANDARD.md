# Operational Document Identity Standard

| Field | Value |
|---|---|
| **Standard ID** | OPERATIONAL-DOCUMENT-IDENTITY-STANDARD-1 |
| **Status** | **Ratified** |
| **Classification** | Platform Architecture Standard |
| **Date** | 2026-07-24 |
| **ADR** | [ADR-ARCH-027](../adrs/ADR-ARCH-027-operational-document-identity.md) |
| **Authority** | ADR-ARCH-018 · ADR-ARCH-022 · ADR-ARCH-026 · ADR-ARCH-027 |
| **Package** | `@shared/operational-document-identity` |

---

## 1. Purpose

Every MineuQR business document exposes **exactly one** human-facing Operational Identity and retains **exactly one** Persistence Identity. These identities are not interchangeable.

This standard is **mandatory** for every existing and future platform.

---

## 2. Definitions

### Persistence Identity

Internal platform identifier (e.g. DB keys, `sr:…`, UUIDs, composite storage keys).

Used for: referential integrity, aggregates, events, idempotency, persistence.

**Never** rendered to operators or customers (OI-03).

### Operational Identity

Human-readable document number (e.g. `ST-000001`, `K-000012`).

Used for: ops UI, search, print, receipts, support, reporting, notifications.

**Never** used in domain / money logic (OI-04).

---

## 3. Architectural Invariants (OI-01 … OI-10)

| ID | Rule |
|----|------|
| **OI-01** | Every document owns exactly one Persistence Identity |
| **OI-02** | Every document owns exactly one Operational Identity |
| **OI-03** | Persistence Identity MUST NEVER be rendered to operators or customers |
| **OI-04** | Operational Identity MUST NEVER participate in domain logic |
| **OI-05** | Operational Identity generation belongs exclusively to the owning Aggregate |
| **OI-06** | Operational Identity is immutable after publication |
| **OI-07** | Presentation layers MUST NEVER compose Operational IDs |
| **OI-08** | Presentation layers MUST obtain Operational Identity from the shared Provider |
| **OI-09** | Changing presentation format MUST NOT require data migration |
| **OI-10** | Operational Identity MUST be stable across UI, print, receipt, PDF, Excel, reporting, notifications, and operational APIs |

---

## 4. Ownership

| Document | Aggregate Owner |
|----------|-----------------|
| Order | Order |
| Session | Session |
| Check | Check |
| Settlement | Settlement |
| Receipt | Settlement |
| Kitchen Ticket | Order |

Future document types **must** declare ownership and register before implementation (AG-7).

---

## 5. Identity Registry (canonical formats)

| Document | Type key | Format |
|----------|----------|--------|
| Order (kiosk/counter) | `order_kiosk` | `K-000001` |
| QR Order | `order_qr` | `Q-000001` |
| Waiter Order | `order_waiter` | `WT-000001` |
| Table | `table` | `T-0001` |
| Session | `session` | `S-000001` |
| Check | `check` | `C-000001` |
| Settlement | `settlement` | `ST-000001` |
| Receipt | `receipt` | Settlement Reference (`ST-…`) |
| Kitchen Ticket | `kitchen_ticket` | `KT-000001` |

Source of truth: `shared/operational-document-identity/registry.ts`.

No document may invent its own format.

---

## 6. Platform Components

### Operational Identity Registry

- Prefix registry  
- Digit policy  
- Ownership  
- Alias policy (Receipt → Settlement)  
- AG-7 registration gate  

### Operational Identity Provider

- `formatOperationalIdentity`  
- `resolveSettlementOperationalIdentity` / Receipt / Session / Check / Table / Kitchen Ticket  
- `isValidOperationalIdentityFormat`  
- `isPersistenceIdentityLeak`  

**No UI component may implement identity formatting.**

Package: `@shared/operational-document-identity`

---

## 7. Architecture Decision

See [ADR-ARCH-027 — Operational Document Identity](../adrs/ADR-ARCH-027-operational-document-identity.md).

---

## 8. Migration Plan

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | Registry | **Done** |
| **2** | Provider | **Done** |
| **3** | Settlement (History / Detail / Receipt / read DTO) | **Done** |
| **4** | Orders (replace ad-hoc / align BI display to registry) | Planned |
| **5** | Checks | Planned |
| **6** | Reporting | Planned |
| **7** | Printing | Planned |
| **8** | Notifications | Planned |
| **9** | Remove legacy presentation helpers | Planned |

OI-09: format changes are presentation-only; Persistence Identity unchanged; no data migration for Phase 1–3.

---

## 9. Affected Platforms

ORDERING · CHECK-MANAGEMENT · SETTLEMENT-RECORD · REPORTING · PRINTING · Dashboard · Kitchen · Waiter · QR · Kiosk · Self Ordering · Notifications · future ERP exports.

---

## 10. Architecture Gates

| Gate | Rule |
|------|------|
| **AG-1** | No Persistence Identity in production UX |
| **AG-2** | No UI composes Operational Identity |
| **AG-3** | Every document resolves via Provider |
| **AG-4** | No duplicate formatter |
| **AG-5** | Operational Identity never in domain decisions |
| **AG-6** | Printing, Reporting, UI display identical identities |
| **AG-7** | New document types require Registry entry first |

---

## 11. Regression Matrix

| Case | Expectation |
|------|-------------|
| Settlement History number | `ST-######` via Provider; never `sr:` |
| Settlement read API `settlementNumber` | Operational Identity via Provider |
| Receipt | Same ST- as Settlement (alias) |
| Provider rejects UUID / `sr:` / `fin:` as operational | `isPersistenceIdentityLeak` |
| Unregistered type | `assertOperationalDocumentRegistered` throws AG-7 |
| Money / Check finalize / Reporting formulas | Unchanged |

---

## 12. Explicit Non-Goals

Do **not** modify: database PKs, aggregate identifiers, relationships, settlement logic, reporting calculations, business rules, event contracts, idempotency, persistence model.

---

## Final Verdict

**OPERATIONAL DOCUMENT IDENTITY STANDARD CERTIFIED**
