# ONBOARDING AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

G-04 preserved.

First restaurant is 0→1 inside user+restaurant+trial **one transaction**. The occupancy helper opens its own transaction and cannot join. `checkLimit` needs a persisted owner subscription that does not exist yet.

Commercial still decides: `assertOnboardingFirstRestaurantPermitted` → trial plan `restaurants` key must allow `proposedTotal = 1` or be explicit unlimited (`null` with key present). Missing/invalid/unreadable plan → `CommercialOccupancyUnavailableError`. Cap 0 → `CommercialLimitExceededError`.

Subsequent restaurant creates use the occupancy helper. Onboarding is not a general bypass.

G-08 P8: distinct owners each get one restaurant; same email unique.
