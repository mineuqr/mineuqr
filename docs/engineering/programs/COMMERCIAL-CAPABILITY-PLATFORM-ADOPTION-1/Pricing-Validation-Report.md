# Pricing Validation Report — COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1

## Authority

Published Offerings are the **only** public pricing source (`commercialCatalog.public.listOfferings`).

## Automated projection checks (PASS)

| Requirement | Result |
|-------------|--------|
| Plan appears after publish | PASS |
| Monthly pricing appears | PASS (`19.00`) |
| Yearly pricing appears | PASS (`190.00`) |
| Included capabilities appear | PASS (`ordering`, `reports`) |
| Metadata appears | PASS (plan name, version name/code, currency) |
| No manual Pricing configuration | PASS (consumer only) |
| Draft/Approved invisible | PASS |
| Retire removes from browse | PASS |
| Archive inaccessible | PASS |

## UI consumer wiring

| Check | Result |
|-------|--------|
| `Pricing.tsx` uses `public.listOfferings` | PASS |
| Renders `offering.featureKeys` via catalog labels | PASS |
| Does not import Capability Filter Registry / Discovery | PASS |
| Checkout remains billing bridge (`legacyPlanId`) | PASS (out of scope; regression-safe) |

## Visual validation (application UI)

| Check | Status |
|-------|--------|
| Plan appears automatically on Pricing Page after publish | **PASS (projection)** · **Live screenshot DEFERRED to AA env** |
| Monthly / Yearly display | Same |
| Capabilities / metadata display | Same |
| Retired/Archived disappear | **PASS (projection)** · Live DEFERRED |
| Existing subscriptions unaffected | **PASS** (Snapshot immutable in E2E) |

## Verdict

**PRICING PUBLICATION OPERATIONAL PASS** (automated). Live visual screenshots to be attached by Architecture Authority certification environment before final Production Certification stamp if required by board process.
