# ORDERING-CHANNEL-GOVERNANCE-1 — Channel Registry Specification

## Location

`shared/ordering-platform/orderingChannelRegistry.ts`

## Responsibilities

| Concern | Registry field |
|---------|----------------|
| Canonical identifier | `id` (`OrderingChannelId`) |
| Display name + localization | `displayName.en` / `displayName.ar` |
| Reporting visibility | `reportingVisible` |
| Reporting sales-channel id | `reportingSalesChannelId` |
| Ordering behavior class | `orderingBehavior` (experience taxonomy only) |
| Lifecycle | `active` \| `registered` |

## Extension procedure

1. Add constant + registry entry in `orderingChannelRegistry.ts`
2. Stamp the place path with the new id
3. No Reporting DTO / API redesign
4. No UI redesign required for Sales Source (unknown / new reporting ids appear when published)

## Forbidden

- Hardcoded channel label maps outside the registry (legacy `REPORTING_SALES_CHANNEL_LABELS` is compatibility-only)
- Inferring channel from `identityScope`
- Defaulting channel at repository insert
