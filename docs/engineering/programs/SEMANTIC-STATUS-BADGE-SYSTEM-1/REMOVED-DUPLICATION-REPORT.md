# Removed Duplication Report — SEMANTIC-STATUS-BADGE-SYSTEM-1

## Eliminated

| Duplicate | Location | Replacement |
| --- | --- | --- |
| Commercial `STATUS_STYLES` | CommercialStatusBadge | mapper + SemanticBadge |
| Health `TONE_CLASS` | HealthStatusBadge | mapper + SemanticBadge |
| Register `dutyClass` / `availabilityClass` / `shiftClass` / `dutyDot` | RegisterStatusBadges | DotBadge / SemanticBadge |
| Fleet pill Tailwind switch | operatorFleetPresentation | semanticBadgeToneClass |
| Security emerald/amber classes | securityCenterDisplay | SEMANTIC_TONE soft |
| Order `statusColors` ×2 | Dashboard + DiningSessionOrdersList | mapOrderStatusToBadgeTone |
| Order label fork in OrdersTab | Dashboard statusLabels | formatOrderStatusLabel |
| Table board badge maps | OperationalBoardCard / ActiveTablesBoardSection | mapper + SemanticBadge |
| Dining session banner colors | DiningSessionBanner | filled semantic tones |
| Offer type color maps ×2 | Dashboard OffersTab | mapOfferTypeToBadgeTone |
| CS account hardcoded fills | CustomerSuccessAccountsSection | SemanticBadge |
| Admin filled status literals | adminSemantic | filled badge registry |

## Remaining (observations)

- Kitchen `kitchenStatusPresentation` color strings
- PrintJobMonitor `TONE_STYLES`
- PaymentHistory / SLA / PlaceholderComingSoon ad-hoc pills
- shadcn `Badge` still used for non-status chrome (intentional)

## Guards

`semanticStatusBadgeSystem.architecture.guards.test.ts` prevents reintroduction of local maps in migrated files.
