# BACKWARD COMPATIBILITY AUDIT

## Owner APIs

`restaurant.create` / `category.create` / `menuItem.create` still return `{ id }`. Quota errors still FORBIDDEN + Arabic text. No request-shape change.

## Admin category/item

Still unlimited quantity (preserved from before occupancy). Compatible with support workflows; incompatible with a strict reading of CE constitution.

## Onboarding

Unchanged first restaurant insert. Compatible.

## POS

Register/activate/deactivate/replace APIs unchanged. Duplicate same-code register still returns the same identity. Slot-neutral replace still skips occupancy (compatible with previous non-atomic behavior — **including the race**).

## Tests

Implementation updated POS 0094 guards and live-plan repair expectations. Existing router tests pass via unlocked occupancy + mocked entitlements.

## Compatibility risks

1. Deploy occupancy app **before** 0094 → INSERT into missing lock table → fail closed (safe, not unlimited). Production **already has 0094**, so deploy-after-schema is the safe order.  
2. `NODE_ENV=test` on a mis-deployed process would skip locks. Production must remain `NODE_ENV=production`.  
3. Clients that treated any FORBIDDEN as “not owner” will continue to; quota messages for owner menu/restaurant remain distinct Arabic strings.

No silent change to Order/Check/Settlement/CRMP/sale APIs.
