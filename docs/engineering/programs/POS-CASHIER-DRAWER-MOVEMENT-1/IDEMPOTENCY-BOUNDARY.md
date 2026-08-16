# IDEMPOTENCY BOUNDARY

CRMP owns retry safety.

POS forwards the caller's `idempotencyKey` to `CrmpFinancialShiftOperationsService.recordDrawerMovement`.

POS does not:

- generate a POS movement id
- hash a second identity (unlike shift-open, which must supply CRMP `financialShiftId`)
- persist a POS idempotency table
- change CRMP duplicate / conflict semantics

Exact retry → CRMP `alreadyApplied: true`.  
Conflicting payload → `idempotency_conflict`.  
Concurrent same key → one movement (CRMP unique identity + OCC retry).
