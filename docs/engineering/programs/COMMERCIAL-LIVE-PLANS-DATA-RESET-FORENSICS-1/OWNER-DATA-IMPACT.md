# OWNER-DATA-IMPACT.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**Do not repair owner access in this program.**

Local `.env` had **no** `OWNER_OPEN_ID`, so env-equality matching was unavailable. Owner is identified by relationships:

- `users.id = 1`
- `role = admin`, `accountClassification = INTERNAL`
- earliest account (`createdAt` 2026-04-01)
- only restaurant with operational orders (`restaurants.id = 720007`, 42 orders)
- last sign-in 2026-08-13

---

## Owner commercial records

| Record | Value |
|--------|--------|
| Account-level subscription | `user_subscriptions.id = 600001`, `restaurantId = 0` |
| Restaurant-level subscription | **none** for user 1 |
| Legacy plan | `30002` Professional |
| Status column | `active` |
| `currentPeriodEnd` | **2026-08-07T21:00:00Z** |
| Period ended vs query time (2026-08-14) | **YES** |
| Trial | `trialEndsAt` null |
| Stripe | none |
| Catalog / snapshot binding | **none** (table empty) |
| Invoices | two **pending** USD 19.00, unpaid |
| Payments | three **declined** Tap tests (May 19), no capture on this user |

This matches the known expired-access incident: account-level subscription exists, period is over, runtime treats the period as ended while the status column still says `active`.

**Class: B. Owner/developer subscription state**, not a customer contract. Unbound. Not snapshot-bound.

---

## Reset impact (catalog-only, if later authorized)

| Action | Effect on owner |
|--------|-----------------|
| Truncate/rebuild `commercial_*` catalog tables | Does **not** delete `600001` |
| Empty bindings (already 0) | No owner binding to remove |
| Bootstrap Basic/Professional/Enterprise | Does **not** create a new owner trial by itself |
| Drop version/snapshot tables | No owner FK; owner is unbound |

A catalog reset **does not fix** expired access (period end is on `user_subscriptions`).  
It **does not by itself worsen** access if the unbound path remains legacy `subscription_plans` 30002.

**Subsequent live-plan deploy risk (separate from reset):** if runtime fail-closes unbound owners, or if a later bind attaches the owner to a missing live plan, access could worsen. That is a **P0 repair dependency**, not a catalog-data dependency.

**Flag:** owner P0 remains open. Catalog reset must not include `user_subscriptions` / `invoices` / `payments` / `users`.
