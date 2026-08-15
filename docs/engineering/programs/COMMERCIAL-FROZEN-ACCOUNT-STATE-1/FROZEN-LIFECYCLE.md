# FROZEN-LIFECYCLE.md

## Approved lifecycle

```
ACTIVE
  ↓  subscription / trial expiration
FROZEN
  ↓  renewal / new active subscription
ACTIVE
```

## ACTIVE

Dashboard, menu management, menu items, QR public menu, screens/devices, and other commercial capabilities work **according to entitlement**.

## FROZEN

The account remains authenticated and recoverable.

Blocked:

- Dashboard commercial management
- Menu / menu item management
- Screen / device **management** (fleet create/revoke)
- Commercial settings
- Other listed commercial mutations

Not deleted:

- users, restaurants, menus, items, QR identity, history, invoices, payments, subscriptions

## Surface classification

| Surface | Frozen behavior |
|---------|-----------------|
| Authentication / login | Allowed |
| Plans / subscription / billing / invoices | Allowed (renewal) |
| Profile | Allowed |
| Dashboard / templates / commercial tabs | Redirect to `/pricing` |
| Menu / item / restaurant / table / holiday mutations | API DENY |
| Device fleet / printer management | API DENY |
| Device **runtime** (already-issued screens) | Not frozen by this denylist; management is blocked |
| Public QR / table QR / QR checkout | Frozen / Subscription Required experience |
| Historical order tracking by token | Allowed (data preserved) |
| Platform Owner FULL_PLATFORM | Outside this lifecycle |
| Owner SIMULATED_PLAN | Outside customer Frozen; uses Owner Access Mode |

## Messaging

Communicate: subscription or trial ended; service is temporarily frozen; data and QR are preserved; renewal restores the same identity.

Do **not** claim account deleted or data loss.
