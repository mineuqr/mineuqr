# TEST PLAN

| Area | Files |
|------|--------|
| Adapter | `server/subscription-runtime/__tests__/requireRestaurantPlanFeature.test.ts` |
| ON/OFF/FULL_PLATFORM/plan-change | `server/subscription-runtime/__tests__/planCapabilityGating.matrix.test.ts` |
| Seed idempotency | `server/services/commercial-catalog/__tests__/seedCatalogPromotedCapabilities.test.ts` |
| Architecture guards | `server/commercial/__tests__/planCapabilityGating.guards.test.ts` |
| Direct API (routers) | `server/routers.test.ts` — menuDesign ON/OFF on template/colors |
| Projection length 19 | existing generation / adoption / rationalization guards |
| UI | sidebar + dashboard featureKey guards; presentation toggle |

FROZEN remains covered by existing `assertCommercialAccountActive` tests — not redefined here.
