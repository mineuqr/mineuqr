# SHIFT DOMAIN FORENSICS

**Canonical entity:** `FinancialShift` only.

There is no separate operational-shift or cashier-shift aggregate. Register Duty is the operational cycle. Cashier attribution is `operatorUserId` on the shift plus Register assignment.

**Identity:** `crmp_financial_shifts.financialShiftId`  
**Human number:** `shiftNumber` via `crmp_register_shift_sequences`

**Statuses:** `open | suspended | closing | handover_pending | closed | archived`

**Lifecycle owner:** `FinancialShiftDomainService` / `CrmpFinancialShiftOperationsService`

One active Financial Shift per Register (domain invariant). Close Register is blocked while an active shift exists.

Archive APIs: `crmp.financialShift.archive`, `listArchive`, `getClosingReport`.
