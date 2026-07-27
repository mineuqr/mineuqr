# ORDERING-CHANNEL-GOVERNANCE-1 — Architecture Compliance Report

| Rule | Status |
|------|--------|
| OrderingChannelId SSOT | Yes |
| Central registry | Yes |
| No identityScope channel inference | Yes |
| Required stamp before persistence | Yes |
| Reporting consumes stamp only | Yes |
| Future channels = registration | Yes |
| No financial / ownership / ADR edits | Yes |
| No Reporting API/DTO redesign | Yes |
| No UI redesign | Yes |

## Observations

1. Live guest path remains `qr`; `table_session` is registry-active and stamp-ready for Table Session place commands / future host.
2. Pre-governance null stamps report as `unassigned` (honest migration), not inferred Table Session.
3. `placeWithIdentity` now requires `orderingChannel` (breaking for unstamped external callers — intentional).

## Verdict recommendation

**B. Certified with observations**
