# ADR-ARCH-040: Multi-Country Compliance Module Layer

> [← ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | **Accepted** |
| **Owner** | Architecture Authority |
| **Program** | MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 |
| **Date** | 2026-08-31 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) (Collection Fact remains financial authority; compliance is downstream) |
| **Does not modify** | Invoice Intent · Cashier Confirm · Collection Fact commit · PAID semantics · Payment methods · Settlement · Realtime · Commercial entitlement routing |
| **Implementation status** | **Foundation only** — registry, orchestrator, NoOp + SA boundary modules; no Tax Profile, Tax Invoice, IRN, QR, VAT engine, or ZATCA integration |
| **Numbering note** | Next constitutional FSP ADR after ADR-ARCH-039. Next free number after this ADR is **041**. |

---

## 1. Problem

MineuQR operates in multiple countries. Country-specific tax and e-invoicing rules (e.g. Saudi ZATCA Phase 1, future UAE) must not be embedded in the global Cashier, Customer, Order, or Collection Fact domains. Without an explicit compliance boundary, country conditionals will leak into financial code (`if (countryCode === "SA")`), creating unmaintainable coupling and risking financial authority violations.

## 2. Context

The Global Core financial lifecycle is established:

```
Invoice Intent → Cashier → Confirm Payment → Collection Fact → PAID
```

Collection Fact is authoritative financial truth (ADR-ARCH-039 target end-state). Compliance artifacts (tax invoices, IRNs, QR codes, correction documents) are **separate** from POS receipts and Collection Facts. Applicability of a country module is determined by **`restaurant.countryCode`**, not by commercial plan entitlement or a separate jurisdiction opt-in.

## 3. Decision

Introduce a **Compliance Layer** downstream of financial commit:

```
Global MineuQR Core
        │
        ├── Cashier
        ├── Customer (future program)
        ├── Order
        ├── Invoice Intent
        ├── Collection Fact
        └── PAID
                │
                ▼
        Compliance Layer
                │
        ├── SA → Saudi/ZATCA module
        ├── AE → UAE module (future)
        └── DEFAULT → NoOp
```

**`countryCode` determines the applicable compliance module; commercial plan entitlement does not determine jurisdiction.**

**Saudi-specific compliance logic must not be placed directly inside Cashier, Customer, Collection Fact, or other global-core domain logic.**

Country routing is centralized in `resolveComplianceModule(countryCode)`. The **Compliance Orchestrator** receives authoritative post-commit events, resolves the module from server-authoritative restaurant context, and invokes module callbacks. Modules **observe** events; they do **not** mutate financial truth.

### 3.1 CountryCode routing

| `restaurant.countryCode` | Module |
|---|---|
| `SA` | Saudi/ZATCA Compliance Module (automatic applicability) |
| `AE` | UAE Tax Compliance Module (future; NoOp until implemented) |
| `BH`, `OM`, `QA`, … | Future modules |
| Unknown / unsupported | NoOpComplianceModule |

Country codes are normalized to **ISO 3166-1 alpha-2 uppercase** (matching `restaurants.countryCode` varchar(2)).

### 3.2 Applicability vs readiness

`countryCode = "SA"` means the Saudi/ZATCA module is **applicable**. It does **not** mean the Saudi Tax Profile is complete or that a Saudi tax invoice can already be issued. Profile completeness and artifact readiness are separate programs.

### 3.3 NoOp / default behavior

Restaurants in countries without an implemented module receive **NoOpComplianceModule**, which preserves existing MineuQR behavior and performs no compliance side effects.

## 4. Global Core

The Global Core remains **country-agnostic**. Cashier Confirm, Collection Fact commit, PAID, tenders, and settlement semantics are unchanged. Compliance hooks run **after** successful production Collection Fact commit via orchestration (`dispatchComplianceAfterProductionCollectionFact`), not inside `commitCashierProductionCollectionFact`.

## 5. Compliance Layer responsibilities

| Responsibility | Owner |
|---|---|
| Country module routing | `resolveComplianceModule` registry |
| Post-commit event dispatch | Compliance Orchestrator |
| Tax profile storage/validation | Deferred (Saudi Tax Profile program) |
| Tax invoice / IRN / QR | Deferred (Saudi Tax Invoice program) |
| Credit notes / correction docs | Deferred |
| ZATCA / Fatoora API calls | Deferred (Phase 1 / Phase 2 programs) |

## 6. Financial boundary — hard contract

Compliance modules **MUST NOT**:

- create or modify Collection Facts
- create or modify PAID
- initiate payment or modify tenders
- become a payment authority
- alter invoice state or financial amounts

The Compliance Layer is **downstream** of financial truth. `collectionFactId` is the authoritative event identity for future compliance artifact idempotency (one artifact per financial event).

## 7. Tax Invoice separation

Tax Invoices, IRNs, tax QR codes, and VAT calculation for compliance purposes are **not** part of this ADR's implementation. POS receipts and Cashier invoice numbers remain operational artifacts, not tax invoices.

## 8. Customer separation

Customer Management (optional customer on Order, tax number snapshots) is a **separate program**. This ADR establishes no Customer tables, APIs, or UI.

## 9. Phase 1 / Phase 2 separation

This foundation does **not** implement ZATCA Phase 1 (tax invoice generation, QR, IRN) or Phase 2 (Fatoora integration, cryptographic signing, clearance). The Saudi module exists as an architectural **boundary only** with no-op callbacks.

## 10. Refund hook

A generic `onRefundCommitted` event contract is defined. Wiring to refund settlement is **deferred** until a stable, non-disruptive refund commit boundary is certified without expanding financial architecture.

## 11. Tenancy / security

Compliance resolution uses **server-authoritative** `restaurantId` → `getRestaurantById` → `countryCode`. Client-provided country codes are not trusted for module routing.

## 12. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Jurisdiction opt-in separate from `countryCode` | Duplicates routing; product decision is automatic applicability from restaurant country |
| Saudi logic inside `commitCashierProductionCollectionFact` | Violates financial boundary; couples global commit to ZATCA |
| Plan entitlement determines jurisdiction | Commercial features ≠ tax jurisdiction |
| Compliance as payment authority | Violates ADR-ARCH-039 Collection Fact authority |

## 13. Consequences

**Positive:**

- Clear extension point for UAE, BH, OM, QA modules
- Regression guards prevent SA leakage into Global Core
- Financial lifecycle unchanged; safe NoOp for unsupported countries

**Negative / deferred:**

- Tax Profile, Tax Invoice, Customer, ZATCA Phase 1/2 require separate certified programs
- Refund compliance hook wiring deferred
- AE currently resolves to NoOp until UAE module program

---

## Related code

| Artifact | Path |
|---|---|
| Module contract | `shared/compliance/complianceModuleContract.ts` |
| Registry | `shared/compliance/resolveComplianceModule.ts` |
| Orchestrator | `server/compliance/ComplianceOrchestrator.ts` |
| Post-commit dispatch | `server/compliance/dispatchComplianceAfterProductionCollectionFact.ts` |
| Architecture guards | `server/compliance/__tests__/multiCountryComplianceLayer.architecture.guards.test.ts` |
