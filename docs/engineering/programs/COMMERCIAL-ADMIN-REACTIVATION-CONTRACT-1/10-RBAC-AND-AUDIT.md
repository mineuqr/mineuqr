# 10 — RBAC AND AUDIT

## RBAC (current)

All live Admin subscription mutations use `assertAdminAccess`. No `requireFeature`.

| Procedure | Can reach `status=active` | Admin-only |
|-----------|---------------------------|------------|
| `admin.updateUserSubscriptionByAdmin` | Yes (implicit) | Yes |
| `admin.createUserSubscriptionByAdmin` | Yes (new row) | Yes |
| `admin.grantCommercialConcession` | No (rejects canceled/expired) | Yes |
| Retired restaurant procedures | No (throw) | Yes |
| PayPal / Tap webhooks | Yes | Provider path — **not** Admin Reactivation |

No alternate customer route performs Admin Reactivation. Webhook activation is a different commercial event.

## Contract RBAC

Dedicated `admin.reactivateUserSubscriptionByAdmin` (name illustrative) MUST call `assertAdminAccess`. Generic update MUST refuse `canceled|expired → active` so Reactivation cannot be smuggled through the status dropdown.

Do not add customer `requireFeature` to this Admin operation.

## Audit (current)

| Event | Covers Reactivation? |
|-------|----------------------|
| `subscription_updated_by_admin` | Status/plan/dates only. No snapshot ids, no charged amount |
| `subscription_created_by_admin` | Create-after-cancel only |
| `commercial_snapshot_created` | Paid create / some snapshot inserts — not a reactivate event |
| `commercial_concession_*` | Not fired by status revive |

Missing: dedicated Reactivation event.

## Required event semantics (do not implement here)

Recommended name: `commercial_subscription_reactivated`

Must capture:

- actor (`actorId`, role)
- `subscriptionId` (same row)
- previous status + new status
- plan UUID (selected)
- billing cycle
- old current snapshot id (or null)
- new snapshot id (or null if free)
- `effectiveFrom`
- reason (required string)
- mode: `paid` | `free`

Do not treat `subscription_updated_by_admin` as sufficient.
