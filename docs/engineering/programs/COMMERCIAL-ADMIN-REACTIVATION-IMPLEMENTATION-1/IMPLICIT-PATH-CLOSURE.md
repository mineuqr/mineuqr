# IMPLICIT PATH CLOSURE

`assertUpdateDoesNotImplicitlyReactivate` in `applyAdminUserSubscriptionUpdate`:

- `canceled|expired â†’ active|trial` rejected (`use_reactivate`)
- not-entitled â†’ entitled (including active + period-ended + future end date) rejected

Ordinary entitled edits (plan/cycle, cancel, no-op) remain.

Webhook activation is unchanged.
