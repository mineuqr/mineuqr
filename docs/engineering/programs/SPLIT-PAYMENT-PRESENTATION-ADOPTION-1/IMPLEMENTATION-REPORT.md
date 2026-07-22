# SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Presentation adoption (API consumer) |
| **ADR** | ADR-ARCH-024 · ADR-ARCH-023 · ADR-ARCH-022 · ADR-ARCH-021 · ADR-ARCH-020 |
| **Prior** | DOMAIN · PERSISTENCE · INTEGRATION · PROJECTION · API (certified) |

---

## Objective

Adopt the canonical `splitPayment.*` Read API across Split Payment presentation surfaces. Presentation remains a pure consumer — no Write Model, Domain, Repository, or Projection Store access.

---

## Delivered

| Artifact | Path |
|----------|------|
| View Models + copy + errors | `client/src/lib/split-payment-presentation/` |
| API hooks | `useSplitPaymentQueries.ts` |
| Check Workspace panel | `client/src/components/split-payment/SplitPaymentPanel.tsx` |
| Workspace adoption | `DiningSessionWorkspaceSheet.tsx` |
| Mutation cache invalidation | `DiningSessionActionBar` · `SessionRowQuickActions` |
| Tests + guards | `split-payment-presentation/__tests__/` |

---

## Data flow (enforced)

```
Presentation (SplitPaymentPanel)
  → splitPayment.* API
    → Projection Read Store
      → Write Model (committed)
```

Presentation never calls Domain, Aggregate, Repository, Projection builders, or materializers.

---

## Adoption targets

| Surface | Change |
|---------|--------|
| Check / Session Workspace | `SplitPaymentPanel` via `listByCheck` + `getOutstanding` + `getSummaryByCheck` + `listAttemptsByCheck` |
| Payment detail (expand) | Tender breakdown · Allocation details · Timeline from payment DTO |
| Mark Paid / Complimentary / Close actions | Invalidate `splitPayment.*` queries |
| Legacy Split Payment presentation reads | **None existed** — greenfield adoption |

`MarkPaidSettlementDialog` remains the **write** tender-capture path (not a Split Payment read). Reporting payment-method widgets remain on `reporting.*`.

---

## View Models

- `SplitPaymentDetailViewModel` — payment row + tender/allocation/timeline formatting
- `SplitPaymentOutstandingViewModel` — Check outstanding display strings
- `SplitPaymentSummaryViewModel` — API-authored status counts
- `SplitPaymentTimelineViewModel` / `SplitPaymentAttemptViewModel`
- `ProjectionMetadataViewModel` — freshness + independent `apiContractVersion`
- Amount **formatting** of API-provided strings only (no recalculation)
- Error kinds: unauthorized / forbidden / notFound / projectionUnavailable / unexpected
- Constitutional note rendered: Payment completion ≠ Check financial settlement

---

## Presentation state

Limited to: loading · empty · success · error · expansion (payment row). No financial state.

Outstanding `NOT_FOUND` is treated as empty outstanding (non-fatal) so payment lists remain usable when outstanding has not been projected yet.

---

## Projection freshness (application, not Presentation)

Post-commit materialization into `getSplitPaymentProjectionStore()` remains an application-boundary concern (documented by SPLIT-PAYMENT-API-1). This program does **not** redesign Integration, Projection, or API modules.

---

## Out of scope (confirmed)

No Architecture · Domain · Persistence · Integration · Projection · API · Reporting redesign · UI inventing financial rules.

---

## End-to-end architecture

```
Check Aggregate
  → Split Payment Domain
    → Persistence
      → Projection
        → Read API
          → View Models
            → Presentation
```

Presentation completes the Split Payment CQRS read path and is replaceable without affecting Projection, API, Domain, or the Financial Settlement Platform.
