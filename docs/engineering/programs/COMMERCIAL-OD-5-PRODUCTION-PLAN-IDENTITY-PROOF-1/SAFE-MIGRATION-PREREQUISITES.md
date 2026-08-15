# SAFE-MIGRATION-PREREQUISITES

OD-5 proves mapping. OD-2 still requires its own design program.

Before any future ALTER of `user_subscriptions.planId`:

1. Re-read distinct production `planId` values immediately before DML (population already changed once since 2026-08-14).
2. Map only via integer → bridge code → current `commercial_plans.id`.
3. Fail closed on any new unmapped integer. Do not guess by price or name.
4. Do not rewrite Charged Terms, status, periods, or provider ids.
5. Do not create bindings as a side effect of identity rewrite.
6. Keep `legacyPlanId` on bindings until a later retirement program.
7. OD-3 (public integer APIs) remains a separate breaking-API decision.

Unbound rows may receive a UUID on the subscription column without creating a binding.
