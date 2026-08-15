# SAFE-DELETE-READINESS

Identity consolidation **did not** make `subscription_plans` SAFE-DELETE ready.

**NO — SCHEMA / ORM REMAINS**  
**NO — EXTERNAL COMPATIBILITY DEPENDENCY REMAINS** (integer public `planId` / subscription column — not a provider id, but still a live compatibility dependency)

Do not drop the table in this program.
