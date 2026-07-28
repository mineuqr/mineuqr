# Migration Report — SEMANTIC-STATUS-BADGE-SYSTEM-1

## Created

- `client/src/design-system/semantic-badge/**`
- Architecture guards test
- Program docs under `docs/engineering/programs/SEMANTIC-STATUS-BADGE-SYSTEM-1/`

## Migrated consumers

- CommercialStatusBadge
- HealthStatusBadge
- RegisterStatusBadges
- FleetOperatorStatusPill + operatorFleetStatusPillClass
- securityStatusBadgeClass
- DiningSessionOrdersList
- OperationalBoardCard
- ActiveTablesBoardSection
- DiningSessionBanner
- Dashboard OrdersTab + OffersTab badges
- CustomerSuccessAccountsSection status badges
- adminSemantic filled status tokens
- landingDashStatusOk / Live

## Unchanged by design

- Domain status enums / contracts
- Reporting / settlement / orders business logic
- APIs / DTOs / DB

## Consumer guidance

```ts
<SemanticBadge tone={mapOrderStatusToBadgeTone(status)}>
  {formatOrderStatusLabel(status, language)}
</SemanticBadge>
```

Do not add local `statusColors` maps.
