# ERROR CLASSIFICATION

**Program:** TYPESCRIPT-DOMAIN-CONTRACT-HARDENING-1  
**Target set:** 30 `ARCHITECTURE_PROGRAM_REQUIRED` diagnostics from TYPESCRIPT-ERROR-FORENSICS-AND-REMEDIATION-1, plus the program-mandated Screen Credential review.

IDs below keep the prior TSF numbers.

## TSF-016 — DiningSessionOrdersList.tsx:67 TS2345

| Field | Value |
|-------|-------|
| Domain | Order display identity (presentation) |
| Owner | Order Business Identity / `OperationalOrderIdentitySource` |
| Root cause | `WorkspaceOrderRow` has optional `businessDay` / `dailyDisplayNumber`; identity source requires `string \| null` / `number \| null` |
| Current contract | Passing the whole row |
| Expected | Map row → identity source |
| Proposed fix | Explicit mapping at the call site |
| Architectural basis | Presentation must not widen Order identity; map fields |
| Risk | Low |
| Test plan | `orderDisplayIdentity.test.ts` |
| Status | **FIX_NOW** — FIXED |

## TSF-017 — MarkPaidSettlementDialog.tsx:75 TS2345

| Field | Value |
|-------|-------|
| Domain | Settlement payment method |
| Owner | `paymentMethod.ts` selectable catalog |
| Root cause | Dialog state typed `MonetaryPaymentMethod` (`cash\|card\|other`); helper expects `SelectablePaymentMethod` (`cash\|card`) |
| Current contract | UI too wide |
| Expected | Staff UI uses selectable keys only |
| Proposed fix | `useState<SelectablePaymentMethod \| null>` |
| Architectural basis | CHECK-SETTLEMENT-METHODS-1: `other` catalog-valid, not selectable |
| Risk | Low — options list already cash/card |
| Test plan | `settlementPaymentMethodCapture.architecture.guards.test.ts` |
| Status | **FIX_NOW** — FIXED |

Not option B (do not add `other` to selectable). Not a new financial method.

## TSF-019 — OrdersWorkspacePanel.tsx:106 TS2769

| Field | Value |
|-------|-------|
| Domain | Order read query options (client tRPC) |
| Owner | Query runtime helper vs tRPC overloads |
| Root cause | `orderReadListQueryOptions` `as const` vs `useQuery` overloads |
| Proposed fix | Later: loosen helper return type without changing listActive API |
| Architectural basis | Not Order/Check/Settlement ownership |
| Status | **FIX_LATER** |

## TSF-053 / TSF-054 — CheckMembershipBackfillService sessionId

| Field | Value |
|-------|-------|
| Domain | Check membership backfill |
| Owner | Check (session optional M4/M5) |
| Root cause | `sessionId: number \| null` passed to `getOrdersBySessionId(number)` |
| Expected | Skip sessionless Checks |
| Status | **FIX_NOW** — FIXED |

## TSF-055 — CheckService.ts:1329 TS2353 hints

| Field | Value |
|-------|-------|
| Domain | Settlement Context |
| Owner | CRMP `resolveSettlementContextForSettle` |
| Root cause | Refund path passed `{ hints }` nested; settle path spreads hints |
| Expected | Same wiring as settle: `{ restaurantId, ...hints, at }` |
| Status | **FIX_NOW** — FIXED |

## TSF-056 — checkSplitPaymentIntegration.ts:209 TS2322

| Field | Value |
|-------|-------|
| Domain | Order Settlement outcomes under Check Split Payment |
| Owner | Check-owned OS integration |
| Root cause | Empty `[]` inferred then assigned to `OrderSettlementCommandOutcome[]` |
| Expected | Annotate local builders with `CheckOrderSettlementMutationResult` element types |
| Status | **FIX_NOW** — FIXED |

## TSF-064 / TSF-065 / TSF-072 / TSF-073 / TSF-074 / TSF-075 / TSF-076 — missing barrel exports

| Field | Value |
|-------|-------|
| Domain | Split Payment (ADR-024) |
| Owner | `splitPaymentContract` / projection contract |
| Root cause | Canonical types exist; `@shared/operational-session` (and check barrel) omitted them |
| Expected | Re-export `Tender`, `TenderAllocation`, `PaymentAllocation`, `PaymentAttemptStatus`, projection identities |
| Status | **FIX_NOW** — FIXED |

## TSF-069 — refundDocumentNumberRepository.ts:51 TS2352

| Field | Value |
|-------|-------|
| Domain | Refund document sequence (Check infra) |
| Owner | mysql2 `ResultSetHeader` vs `{ n: number }[]` |
| Root cause | Driver result typing |
| Status | **FIX_LATER** — do not `as unknown` as the fix |

## TSF-077 — IdentityPlaceOrderService.ts:128 TS2322

| Field | Value |
|-------|-------|
| Domain | Order → Check enrollment |
| Owner | Order persist then Check `ensureCheckForOrder` |
| Root cause | `Order.id` optional until persisted |
| Expected | Require persisted `orderId` before enrollment |
| Status | **FIX_NOW** — FIXED |

## TSF-078 — DrizzleBusinessIdentityAllocator.ts:72 TS2352

| Field | Value |
|-------|-------|
| Domain | Order business identity sequence |
| Owner | mysql2 LAST_INSERT_ID typing |
| Status | **FIX_LATER** — same driver issue as TSF-069 |

## TSF-079 / TSF-083 / TSF-084 / TSF-085 / TSF-086 — NormalizedWorkingHours not exported

| Field | Value |
|-------|-------|
| Domain | Business-day read utility |
| Owner | `restaurantHours.NormalizedWorkingHours`; `businessDay.ts` is the Order-read import path |
| Root cause | Type imported locally, not re-exported |
| Expected | `export type { NormalizedWorkingHours }` |
| Status | **FIX_NOW** — FIXED |

Direct dependency (same export): TSF-187 / TSF-188 reporting timeSeries files (previously LEGACY_ACCEPTED). Reporting remains read-side.

## TSF-080 / TSF-081 / TSF-082 — DrizzleOrderRepository correlationId

| Field | Value |
|-------|-------|
| Domain | Order persistence observability |
| Owner | `SaveOrderOptions.correlationId?: string \| null` vs log `string \| undefined` |
| Expected | `?? undefined` at log boundary |
| Status | **FIX_NOW** — FIXED |

## TSF-170 — resolveSettlementContext.ts:76 TS18049

| Field | Value |
|-------|-------|
| Domain | Settlement Context hints |
| Owner | CRMP |
| Root cause | `hints.registerId?.trim()` does not narrow later `.trim()` |
| Expected | Local `hintedRegisterId` |
| Status | **FIX_NOW** — FIXED |

## TSF-181…184 — splitPaymentProjectionBuilder never

| Field | Value |
|-------|-------|
| Domain | Split Payment projection claim keys |
| Owner | Event union exhaustiveness |
| Root cause | Dead fallback after union already narrowed to `never` |
| Expected | `const exhaustive: never = event` |
| Status | **FIX_NOW** — FIXED |

## ScreenCredentialRecovery (prior TSF-052, was FIX_LATER)

| Field | Value |
|-------|-------|
| Domain | Operational device credentials |
| Owner | Issuance token vs recovery presentation |
| Root cause | Recovery object missing `pairingCode` required on `IssuedOperationalDeviceToken` |
| Expected | `presentRecovery` takes stored-token Pick |
| Status | **FIX_NOW** — FIXED |

## Out of scope (not classified as target FIX_NOW)

- 118 TS2802 CONFIGURATION
- App.tsx / KioskShell — already remediated; current count 0
- Unrelated FIX_LATER / LEGACY / TEST_HARNESS
