# IMPLEMENTATION

Dedicated procedure: `admin.reactivateUserSubscriptionByAdmin`

Orchestrator: `server/commercial/adminReactivation.ts`

Paid persist: `applyAdminPaidReactivation` â€” always INSERT Snapshot N+1 (`source=admin_reactivate`) then activate the same row in one transaction.

Free persist: `applyAdminFreeReactivation` â€” INSERT new concession (`source=admin_reactivate`) + activate + align period end in one transaction. No Charged Terms.

Price: `resolveChargedTermsForAdminCreate` â†’ `currentPriceForPlan`. Binding leftover is not read.

No schema migration. `source` is `varchar(32)`.
