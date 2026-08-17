# REMEDIATION DECISIONS

**Program:** TYPESCRIPT-DOMAIN-CONTRACT-HARDENING-1

## FIX_NOW applied

| Area | Change | Why it is not architecture invention |
|------|--------|-------------------------------------|
| MarkPaid dialog | State type `SelectablePaymentMethod` | Matches certified selectable catalog; does not add `other` |
| DiningSessionOrdersList | Map row → identity source | Presentation adapter; Order identity owner unchanged |
| Screen recovery | `presentRecovery` Pick without pairingCode | Recovery ≠ issuance |
| Check membership backfill | Skip `sessionId == null` | Sessionless Check has no session orders |
| CheckService refund | Spread hints like settle | Same CRMP contract |
| Split Payment barrels | Re-export existing types | Contract already owned by ADR-024 |
| IdentityPlaceOrder | Require persisted `order.id` | Check enrollment needs Order identity |
| Order repository logs | `correlationId ?? undefined` | Observability boundary |
| businessDay.ts | Re-export `NormalizedWorkingHours` | Canonical hours type already in restaurantHours |
| Split payment OS outcomes | Annotate local arrays | Check-owned OS outcome union |
| Projection claim key | Exhaustive `never` | Union already complete |
| Settlement context | `hintedRegisterId` | Fail-open CRMP; no fabricated register |

## FIX_LATER (remaining from the 30)

| ID | Why deferred |
|----|----------------|
| TSF-019 OrdersWorkspacePanel | tRPC `useQuery` overload vs `as const` helper — not financial ownership |
| TSF-069 refund LAST_INSERT_ID | mysql2 `ResultSetHeader`; `as unknown` forbidden as default |
| TSF-078 BI allocator LAST_INSERT_ID | same driver typing |

## ARCHITECTURE_DECISION_REQUIRED

None for the applied fixes. MarkPaid did **not** require inventing a payment method.

## Not done

- No `any` / `@ts-ignore` / `@ts-expect-error`
- No tsconfig change
- No Commercial Occupancy files
- No App.tsx / KioskShell
- No schema / migration
