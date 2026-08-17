# POS READ API GATE

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1  
**Does not start** `POS-READ-APIS-IMPLEMENTATION-1`.

## POS_READ_API_BLOCKERS

**None.**

No remaining diagnostic is a broken **read model, DTO, tRPC output, order/check/settlement/reporting/device read contract** that POS-READ-APIS would have to consume or invent around.

## POS_READ_API_NON_BLOCKERS

All 27 remaining after FIX_NOW, plus the remediated TDA-013 (device write consumer).

| ID | Why it can remain while POS read APIs begin |
|----|-----------------------------------------------|
| TDA-001…007, 009…012, 019, 021, 022 | Admin / design-system / guest-kiosk / dashboard **presentation** |
| TDA-008 | Client React Query `structuralSharing` vs `unknown`; `order.read.listActive` already exists with `z.coerce.number().int().positive()` |
| TDA-014 | Same helper on kitchen queue **client** cache |
| TDA-015 | Freeze helper `readonly` arrays on screen snapshot |
| TDA-016…018 | PDF export typings (`bidi-js`, pdfkit, Blob) |
| TDA-020 | Restaurant Dashboard tax form props |
| TDA-023…025 | mysql2/`db.execute` LAST_INSERT_ID **write** sequences |
| TDA-026…027 | Reporting UX UAT `__scripts__` |
| TDA-028 | Legacy reporting surface type predicate |
| TDA-013 (fixed) | Was device **mutation** restaurant scope, not a read DTO |

## Nearby contract observation (not a tsc diagnostic)

tRPC infers `restaurantId: unknown` on some `z.coerce.number()` inputs (visible inside TDA-008’s overload text). Runtime schema still coerces to a positive int. POS-READ-APIS should prefer `z.number().int().positive()` **or** accept coerce with an explicit output type if a new procedure is added. That is implementation guidance, not a blocker in this 28.

## Decision

**A — 28 FULLY CLASSIFIED. NO POS BLOCKERS. READY FOR POS-READ-APIS.**

Do not start POS-READ-APIS from inside this program.
