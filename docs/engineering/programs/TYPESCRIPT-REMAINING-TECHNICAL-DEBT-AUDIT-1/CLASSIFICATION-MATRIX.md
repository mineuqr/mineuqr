# CLASSIFICATION MATRIX

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1  
UNCLASSIFIED = 0.

Primary disposition is exactly one of A–H per diagnostic.

## Totals (baseline 28)

| Disposition | Count | IDs |
|-------------|------:|-----|
| A FIX_NOW | 1 | TDA-013 (applied) |
| B FIX_BEFORE_POS_READ_APIS | 0 | — |
| C FIX_LATER | 22 | TDA-001…012, 014, 015, 019…025, 028 |
| D ARCHITECTURE_PROGRAM_REQUIRED | 0 | — |
| E LEGACY_ACCEPTED | 0 | — |
| F TEST_HARNESS | 2 | TDA-026, TDA-027 |
| G TOOLING / CONFIGURATION | 3 | TDA-016, TDA-017, TDA-018 |
| H NON_BLOCKING_TECHNICAL_DEBT | 0 | (FIX_LATER used when a later fix is known) |
| I UNCLASSIFIED | 0 | — |

No diagnostic is labeled “technical debt” merely because it remains. FIX_LATER items have a concrete type-level cause and a non-POS owner.

## Why none are FIX_BEFORE_POS_READ_APIS

POS-READ-APIS-IMPLEMENTATION-1 is a **server read-model / DTO / router** program. Remaining diagnostics that *touch* order/kitchen/device files are:

| ID | Touches | Why not a blocker |
|----|---------|-------------------|
| TDA-008 | `order.read.listActive` **client** `useQuery` options | `structuralSharing` generic vs React Query `unknown`. Output type `ActiveOrderListResult` is not the error. |
| TDA-014 | kitchen queue **client** `useQuery` options | Same helper mismatch. Queue input/output types are already unions. |
| TDA-015 | freeze helper on screen runtime snapshot | `readonly` vs mutable arrays after `Object.freeze`. Not a POS DTO. |
| TDA-013 | device **executeOrderAction** + broadcast | Write/interaction path. Fixed locally via existing `tenantId`. |
| TDA-023…025 | LAST_INSERT_ID **writes** | Sequence allocators, not read APIs. |
| TDA-020, 024, 026 | tax / refund **labels or writes** | No ambiguous financial *ownership*. Typing / UAT / UI only. |

Do not automatically block POS because a diagnostic exists in a nearby file.
