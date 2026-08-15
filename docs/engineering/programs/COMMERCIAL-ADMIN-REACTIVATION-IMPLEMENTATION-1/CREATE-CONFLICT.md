# CREATE CONFLICT

`createUserSubscriptionByAdmin` now CONFLICTS when `getOwnerAccountSubscriptionRow` returns any account-level row (active, canceled, expired, read-time expired).

Create remains valid only when no account-level row exists.

This closes accidental Model C.
