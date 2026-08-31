# BASELINE

**Program:** MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1  
**Measured:** 2026-08-31  
**Starting SHA:** `672d9a9388cdabc8a2a80288457a9650614fd000`

## Scope

This program establishes **only** the architectural foundation for MineuQR's multi-country compliance layer:

- ADR-ARCH-040
- Compliance Module contract
- Country → module registry (`resolveComplianceModule`)
- NoOp + Saudi/ZATCA boundary modules
- Compliance Orchestrator + post-commit dispatch hook
- Architecture regression guards

**Explicitly out of scope:** Customer Management, Tax Profile, Tax Invoice, IRN, QR, VAT engine changes, Credit Notes, ZATCA Phase 1/2, UAE implementation, Realtime changes, financial lifecycle changes.

## Global Core

```
Invoice Intent → Cashier → Confirm Payment → Collection Fact → PAID
```

Financial authority remains in Collection Fact commit. `commitCashierProductionCollectionFact` is **not** modified with country-specific logic.

## Compliance Layer

```
Collection Fact committed
        ↓
dispatchComplianceAfterProductionCollectionFact
        ↓
ComplianceOrchestrator
        ↓
resolveComplianceModule(countryCode from server restaurant context)
        ↓
module.onProductionCollectionFactCommitted(event)
```

Modules observe authoritative events. They do not create or mutate financial records.

## CountryCode routing

| Code | Module |
|------|--------|
| `SA` | `saudiZatcaComplianceModule` (boundary only; callbacks no-op) |
| `AE`, unknown | `noOpComplianceModule` |

**`countryCode` determines applicable module automatically.** No separate jurisdiction opt-in. Commercial plan entitlement does not determine jurisdiction.

Country codes: ISO 3166-1 alpha-2 uppercase (`restaurants.countryCode` varchar(2)).

## Applicability vs readiness

SA module **applicability** ≠ Tax Profile complete ≠ ready to issue tax invoice.

## Orchestrator responsibility

- Receive post-commit compliance event
- Resolve country from authoritative restaurant record
- Route to module
- Best-effort dispatch (does not block Cashier paid response)

## Module responsibility

- Observe `ProductionCollectionFactCommittedEvent`
- Future: tax profile, validators, artifacts, numbering, QR (separate programs)
- **Must not** mutate Collection Fact, PAID, tenders, or payment state

## Event contract

`ProductionCollectionFactCommittedEvent`:

- `collectionFactId` — authoritative event identity
- `restaurantId`, `orderId`, `countryCode`, `committedAt`, `commitOutcome`
- optional `cashierInvoiceNumber` (operational, not tax invoice)

## Financial boundary

Compliance is downstream. Forbidden in modules and global core:

- Collection Fact create/modify
- PAID create/modify
- Payment/tender authority
- Tax invoice creation (this program)

## Forbidden dependencies (Global Core)

Global Core must **not** import:

- `saudiZatcaComplianceModule`
- `resolveComplianceModule`
- ZATCA identifiers
- `countryCode === "SA"` branches

Country routing belongs **only** in `shared/compliance/resolveComplianceModule.ts`.

> **Country-specific compliance behavior belongs to the Compliance Layer and must not leak into Global Core financial/POS domain logic.**

## Future module extension model

1. Add module under `shared/compliance/modules/`
2. Register in `resolveComplianceModule.ts`
3. Implement callbacks in a dedicated country program
4. Extend architecture guards if new forbidden paths emerge

## Deferred

| Item | Reason |
|------|--------|
| `onRefundCommitted` wiring | No stable refund commit hook without financial disruption |
| Tax Profile | Separate program |
| Tax Invoice / IRN / QR | Separate program |
| UAE module behavior | Future program |
| Compliance artifact persistence | Future program |

## Realtime

No Realtime architecture changes. Compliance uses existing server-side post-commit dispatch pattern (`dispatchBestEffortDownstreamDelivery`).
