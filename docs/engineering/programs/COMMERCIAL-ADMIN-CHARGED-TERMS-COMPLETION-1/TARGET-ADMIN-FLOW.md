# TARGET ADMIN FLOW (implemented)

```
CustomerSuccessAccountsSection (unchanged UI — no amount input)
  ↓ mutate { userId, planId UUID, billingCycle, status, subscriptionEndDate? }
  ↓
admin.createUserSubscriptionByAdmin (livePlanUuidInput)
  ↓
applyAdminUserSubscriptionCreate
  ↓ resolveLivePlanById (UUID only)
  ↓ resolveChargedTermsForAdminCreate(planId, billingCycleCode)
       validate cycle ∈ {monthly, yearly} and exists in catalog
       reject hidden / missing plan
       currentPriceForPlan(planId, billingCycleCode)
       require amount > 0 and currency from the price row
  ↓ createSubscriptionForRestaurant (lifecycle)
  ↓ persistAdminCreateChargedTerms
       insert Binding + Charged Terms (no onDuplicateKeyUpdate)
       identical retry → idempotent success
       different existing terms → fail (immutable)
  ↓ on persist failure: deleteUserSubscriptionById(result.id) (compensation, not SQL atomicity) then PRECONDITION_FAILED
  ↓ audit subscription_created_by_admin only after financial completion
```

Admin **update** changes lifecycle only. It does **not** re-bind or overwrite Charged Terms (OD-ADMIN-CT-04 for a future new-snapshot policy).

Webhook/trial still use fail-soft `ensureLivePlanBoundForSubscription`.
