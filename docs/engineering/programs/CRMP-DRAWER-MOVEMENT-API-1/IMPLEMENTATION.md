# IMPLEMENTATION

1. Domain `recordDrawerMovement`: if `movementId` already present and equivalent (type, normalized amount, reason, actor), return the same shift; if conflicting, `CrmpConflictError`.
2. `FinancialShiftDomainService.recordMovement`: optional `movementId`; one OCC retry; return `{ shift, alreadyApplied }`.
3. `CrmpFinancialShiftOperationsService.recordDrawerMovement`: load register, resolve active open shift, compare hint, reject currency mismatch, derive `movementId` from idempotency scope, stamp actor, call domain.
4. Router procedure `crmp.financialShift.recordDrawerMovement`.
5. DTO: `DrawerMovementCommandResultDto`.

POS is unchanged.
