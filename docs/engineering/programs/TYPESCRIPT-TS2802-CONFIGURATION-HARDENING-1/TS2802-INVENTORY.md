# TS2802 INVENTORY

**Program:** TYPESCRIPT-TS2802-CONFIGURATION-HARDENING-1
**Count:** 118
**Command:** pnpm check → tsc --noEmit

All 118 diagnostics are the same family: `for-of` (or equivalent iteration) over Map/Set/Iterator while tsc’s implicit target is ES5.

Runtime of generated code is **not** tsc. tsc is `noEmit`. Client emit is Vite; server emit is esbuild `--platform=node`.

## By iterable kind

| Kind | Count |
|------|------:|
| MapIterator for-of | 98 |
| Set for-of | 16 |
| Map for-of | 3 |
| ReadonlyMap for-of | 1 |

## By build pipeline (check vs emit)

| Pipeline | Count |
|----------|------:|
| esbuild Node bundle (tsc check-only) | 99 |
| consumed by Vite and/or esbuild (tsc check-only) | 11 |
| Vite client bundle (tsc check-only) | 8 |

## Every occurrence

### TS2802-001

| Field | Value |
|-------|-------|
| file | `client/src/components/admin/platform-ops/commercial-catalog/experience/versionCompare.ts` |
| line | 39 |
| column | 19 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-002

| Field | Value |
|-------|-------|
| file | `client/src/components/admin/platform-ops/commercial-catalog/experience/versionCompare.ts` |
| line | 54 |
| column | 20 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-003

| Field | Value |
|-------|-------|
| file | `client/src/lib/operational-screen/kitchen/kitchenQueueInvalidationCoordinator.ts` |
| line | 34 |
| column | 23 |
| diagnostic | Type 'MapIterator<Entry>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-004

| Field | Value |
|-------|-------|
| file | `client/src/lib/operational-screen/runtimeContextStore.ts` |
| line | 66 |
| column | 28 |
| diagnostic | Type 'Set<RuntimeContextSubscriber>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-005

| Field | Value |
|-------|-------|
| file | `client/src/lib/orders-workspace/ordersListActiveInvalidationCoordinator.ts` |
| line | 49 |
| column | 23 |
| diagnostic | Type 'MapIterator<Entry>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-006

| Field | Value |
|-------|-------|
| file | `client/src/lib/reporting-exports/paymentMethodAnalysisPresentation.ts` |
| line | 75 |
| column | 32 |
| diagnostic | Type 'ReadonlyMap<string, Readonly<{ paymentMethod: string; category: string; tenderAmount: string; transactionCount: number; checkCount: number; averageCheck: string; mixPercent: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | ReadonlyMap for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-007

| Field | Value |
|-------|-------|
| file | `client/src/lib/reporting-exports/salesSourceAnalysisPresentation.ts` |
| line | 90 |
| column | 25 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-008

| Field | Value |
|-------|-------|
| file | `client/src/lib/reporting-exports/salesSourceAnalysisPresentation.ts` |
| line | 156 |
| column | 25 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | Vite client bundle (tsc check-only) |

### TS2802-009

| Field | Value |
|-------|-------|
| file | `server/commercial/metrics/CanonicalMetricsService.ts` |
| line | 279 |
| column | 10 |
| diagnostic | Type 'Set<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-010

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 57 |
| column | 18 |
| diagnostic | Type 'MapIterator<Readonly<{ registerId: string; restaurantId: number; code: string; displayName: string; registerType: "settlement_station" \| "counter" \| "mobile_pos"; status: "active" \| "provisioned" \| "inactive"; ... 7 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-011

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 85 |
| column | 23 |
| diagnostic | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-012

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 97 |
| column | 18 |
| diagnostic | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-013

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 107 |
| column | 18 |
| diagnostic | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-014

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 124 |
| column | 22 |
| diagnostic | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-015

| Field | Value |
|-------|-------|
| file | `server/crmp/InMemoryCrmpStore.ts` |
| line | 161 |
| column | 23 |
| diagnostic | Type 'MapIterator<Readonly<{ financialShiftId: string; shiftNumber: number; restaurantId: number; registerId: string; operatorUserId: number; status: "open" \| "closed" \| "archived" \| "suspended" \| "closing" \| "handover_pending"; ... 10 more ...; updatedAt: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-016

| Field | Value |
|-------|-------|
| file | `server/db.ts` |
| line | 804 |
| column | 30 |
| diagnostic | Type 'MapIterator<[string, number]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-017

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/multiCheckAllocationRepository.ts` |
| line | 376 |
| column | 8 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-018

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 120 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "adjusted"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-019

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 139 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "adjusted"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-020

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 157 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "adjusted"; ... 34 more ...; metadata: Readonly<...>; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-021

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/multiCheckAllocationProjectionStore.ts` |
| line | 174 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; allocationId: string; allocationReference: string; financialReference: string \| null; sourceCheckId: number; sourcePaymentId: string \| null; allocationStatus: "pending" \| ... 5 more ... \| "adjusted"; ... 16 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-022

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/orderSettlementProjectionStore.ts` |
| line | 67 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; orderId: number; settlementStatus: "pending" \| "complimentary" \| "refunded" \| "cancelled" \| "voided" \| "settled" \| "partially_settled"; ... 14 more ...; projectionRevision: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-023

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/orderSettlementProjectionStore.ts` |
| line | 78 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; orderId: number; settlementStatus: "pending" \| "complimentary" \| "refunded" \| "cancelled" \| "voided" \| "settled" \| "partially_settled"; ... 14 more ...; projectionRevision: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-024

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 107 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; paymentId: string; paymentReference: string; financialReference: string \| null; paymentStatus: "pending" \| "failed" \| "refunded" \| "cancelled" \| ... 4 more ... \| "partially_applied"; ... 30 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-025

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 120 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; paymentId: string; paymentReference: string; financialReference: string \| null; paymentStatus: "pending" \| "failed" \| "refunded" \| "cancelled" \| ... 4 more ... \| "partially_applied"; ... 30 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-026

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/read/splitPaymentProjectionStore.ts` |
| line | 154 |
| column | 16 |
| diagnostic | Type 'MapIterator<Readonly<{ restaurantId: number; checkId: number; attemptId: string; paymentId: string \| null; attemptStatus: PaymentAttemptStatus; amount: string; method: TenderMethod; ... 8 more ...; projectionTimestamp: string; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-027

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/refundDocumentNumberRepository.ts` |
| line | 128 |
| column | 19 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-028

| Field | Value |
|-------|-------|
| file | `server/operational-session/check/settlementRecordRepository.ts` |
| line | 141 |
| column | 19 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-029

| Field | Value |
|-------|-------|
| file | `server/realtime-platform/gateway/RealtimeSseGateway.ts` |
| line | 267 |
| column | 26 |
| diagnostic | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-030

| Field | Value |
|-------|-------|
| file | `server/realtime-platform/observability/realtimeObservabilityStore.ts` |
| line | 297 |
| column | 11 |
| diagnostic | Type 'MapIterator<[number, number]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-031

| Field | Value |
|-------|-------|
| file | `server/realtime-platform/pubsub/RealtimePubSub.ts` |
| line | 43 |
| column | 27 |
| diagnostic | Type 'Set<RealtimeBusSubscriber>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-032

| Field | Value |
|-------|-------|
| file | `server/realtime-platform/tickets/RealtimeOpaqueTicketRegistry.ts` |
| line | 278 |
| column | 30 |
| diagnostic | Type 'Map<string, RealtimeOpaqueTicketRecord>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Map for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-033

| Field | Value |
|-------|-------|
| file | `server/realtime-platform/tickets/RealtimeOpaqueTicketRegistry.ts` |
| line | 329 |
| column | 24 |
| diagnostic | Type 'MapIterator<RealtimeOpaqueTicketRecord>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-034

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/businessMetricsAggregator.ts` |
| line | 203 |
| column | 54 |
| diagnostic | Type 'MapIterator<[string, TrendAcc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-035

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 93 |
| column | 31 |
| diagnostic | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-036

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 93 |
| column | 57 |
| diagnostic | Type 'MapIterator<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-037

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/financialReportingParity.ts` |
| line | 94 |
| column | 24 |
| diagnostic | Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-038

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/OrderSalesMetricsService.ts` |
| line | 146 |
| column | 18 |
| diagnostic | Type 'MapIterator<[string, { orderCount: number; completedOrders: number; sales: number; }]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-039

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/PaymentMethodAnalyticsService.ts` |
| line | 83 |
| column | 14 |
| diagnostic | Type 'MapIterator<["complimentary" \| "card" \| "cash" \| "other" \| "mada" \| "visa" \| "mastercard" \| "apple_pay" \| "stc_pay" \| "bank_transfer", Acc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-040

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/PaymentMethodAnalyticsService.ts` |
| line | 130 |
| column | 21 |
| diagnostic | Type 'MapIterator<Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-041

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 65 |
| column | 29 |
| diagnostic | Type 'Map<string, Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Map for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-042

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 71 |
| column | 21 |
| diagnostic | Type 'MapIterator<Acc>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-043

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/SalesChannelAnalyticsService.ts` |
| line | 77 |
| column | 57 |
| diagnostic | Type 'MapIterator<[string, Acc]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-044

| Field | Value |
|-------|-------|
| file | `server/reporting-platform/settlementTransactionReportingAdapter.ts` |
| line | 56 |
| column | 14 |
| diagnostic | Type 'MapIterator<["complimentary" \| "card" \| "cash" \| "other" \| "mada" \| "visa" \| "mastercard" \| "apple_pay" \| "stc_pay" \| "bank_transfer", { count: number; amount: number; }]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-045

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 101 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-046

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 106 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-047

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 563 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-048

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 568 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-049

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 636 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-050

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/adoptionService.ts` |
| line | 641 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-051

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 51 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-052

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 60 |
| column | 11 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-053

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 79 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-054

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 145 |
| column | 42 |
| diagnostic | Type 'MapIterator<[string, CommercialPrice]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-055

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 323 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-056

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 374 |
| column | 31 |
| diagnostic | Type 'MapIterator<[string, CommercialPrice]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-057

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 387 |
| column | 23 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-058

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 400 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-059

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 412 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-060

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 435 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-061

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 443 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-062

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 455 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-063

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 532 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-064

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 540 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-065

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 552 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-066

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 620 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-067

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 635 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-068

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 661 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-069

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 677 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-070

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 714 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-071

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 733 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-072

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 783 |
| column | 16 |
| diagnostic | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-073

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 799 |
| column | 13 |
| diagnostic | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-074

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 832 |
| column | 24 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-075

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 836 |
| column | 26 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-076

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/index.ts` |
| line | 857 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-077

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 96 |
| column | 22 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-078

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 99 |
| column | 20 |
| diagnostic | Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-079

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 106 |
| column | 20 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-080

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 113 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-081

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 120 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-082

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 164 |
| column | 18 |
| diagnostic | Type 'MapIterator<T>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-083

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 198 |
| column | 18 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-084

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 199 |
| column | 19 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-085

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 200 |
| column | 26 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-086

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 201 |
| column | 27 |
| diagnostic | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-087

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 202 |
| column | 27 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-088

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 203 |
| column | 26 |
| diagnostic | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-089

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 204 |
| column | 24 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-090

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 205 |
| column | 26 |
| diagnostic | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-091

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 206 |
| column | 20 |
| diagnostic | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-092

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 207 |
| column | 30 |
| diagnostic | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-093

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 208 |
| column | 23 |
| diagnostic | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-094

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 235 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialLivePlan>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-095

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 264 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialBillingCycle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-096

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 285 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialFeatureBundle>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-097

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 300 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-098

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 311 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialLimitProfile>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-099

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 326 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialLimitValue>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-100

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 338 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialTrialPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-101

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 358 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialMigrationPolicy>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-102

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 379 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialRegion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-103

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 406 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialPromotion>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-104

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 433 |
| column | 21 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-105

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/livePlanPersistence.ts` |
| line | 469 |
| column | 24 |
| diagnostic | Type 'MapIterator<CommercialPrice>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-106

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/persistentCatalogBootstrap.ts` |
| line | 83 |
| column | 33 |
| diagnostic | Type 'MapIterator<CommercialBundleFeature>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-107

| Field | Value |
|-------|-------|
| file | `server/services/commercial-catalog/runtimeAuthorityObservability.ts` |
| line | 72 |
| column | 34 |
| diagnostic | Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | esbuild Node bundle (tsc check-only) |

### TS2802-108

| Field | Value |
|-------|-------|
| file | `shared/data-retention/adapters/retentionAdapter.ts` |
| line | 59 |
| column | 21 |
| diagnostic | Type 'MapIterator<Readonly<{ entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; resolveEntity: (subject: Readonly<...>) => boolean \| Promis...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-109

| Field | Value |
|-------|-------|
| file | `shared/data-retention/holds/retentionHolds.ts` |
| line | 54 |
| column | 18 |
| diagnostic | Type 'MapIterator<Readonly<{ holdId: string; kind: "legal_hold" \| "financial_hold" \| "manual_hold"; restaurantId: number; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| ... 7 more ... \| "generic"; ... 4 more ...; placedBy?: string \| undefined; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-110

| Field | Value |
|-------|-------|
| file | `shared/data-retention/holds/retentionHolds.ts` |
| line | 59 |
| column | 18 |
| diagnostic | Type 'MapIterator<Readonly<{ holdId: string; kind: "legal_hold" \| "financial_hold" \| "manual_hold"; restaurantId: number; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| ... 7 more ... \| "generic"; ... 4 more ...; placedBy?: string \| undefined; }>>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-111

| Field | Value |
|-------|-------|
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 95 |
| column | 21 |
| diagnostic | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-112

| Field | Value |
|-------|-------|
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 107 |
| column | 28 |
| diagnostic | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-113

| Field | Value |
|-------|-------|
| file | `shared/data-retention/registry/policyRegistry.ts` |
| line | 118 |
| column | 24 |
| diagnostic | Type 'MapIterator<Readonly<{ policyId: string; entityType: "check" \| "session" \| "notification" \| "order" \| "register" \| "settlement_record" \| "financial_shift" \| "audit_event" \| "print_job" \| "device_log" \| "operational_log" \| "kitchen_history" \| "reporting_snapshot" \| "generic"; ... 13 more ...; restaurantId?: number \| ...' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-114

| Field | Value |
|-------|-------|
| file | `shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts` |
| line | 159 |
| column | 27 |
| diagnostic | Type 'MapIterator<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-115

| Field | Value |
|-------|-------|
| file | `shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts` |
| line | 174 |
| column | 32 |
| diagnostic | Type 'Map<number, number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Map for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-116

| Field | Value |
|-------|-------|
| file | `shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts` |
| line | 458 |
| column | 8 |
| diagnostic | Type 'Set<number>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-117

| Field | Value |
|-------|-------|
| file | `shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts` |
| line | 152 |
| column | 8 |
| diagnostic | Type 'Set<TenderMethod>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | Set for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

### TS2802-118

| Field | Value |
|-------|-------|
| file | `shared/read-freshness/mergeOrderCaches.ts` |
| line | 125 |
| column | 24 |
| diagnostic | Type 'MapIterator<KitchenTicketLike>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher. |
| syntax | MapIterator for-of |
| depends on iterable/downlevel | yes — native Map/Set iteration |
| tsc emit | none (`noEmit: true`) |
| production pipeline | consumed by Vite and/or esbuild (tsc check-only) |

