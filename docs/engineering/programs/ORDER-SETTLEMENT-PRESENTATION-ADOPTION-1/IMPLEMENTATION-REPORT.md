# ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Presentation adoption (API consumer) |
| **ADR** | ADR-ARCH-022 · ADR-ARCH-020 · ADR-ARCH-021 |
| **Prior** | DOMAIN · PERSISTENCE · INTEGRATION · PROJECTION · API (certified) |

---

## Objective

Adopt the canonical `orderSettlement.*` Read API across settlement presentation surfaces. Presentation remains a pure consumer — no Write Model, Domain, Repository, or Projection Store access.

---

## Delivered

| Artifact | Path |
|----------|------|
| View Models + copy + errors | `client/src/lib/order-settlement-presentation/` |
| API hooks | `useOrderSettlementQueries.ts` |
| Check Workspace panel | `client/src/components/order-settlement/OrderSettlementPanel.tsx` |
| Workspace adoption | `DiningSessionWorkspaceSheet.tsx` |
| Legacy removal | `deriveSettlementSummary` + `DiningSessionSettlementSummarySection` removed |
| Mutation cache invalidation | `DiningSessionActionBar` · `SessionRowQuickActions` |
| Projection hydration (Session boundary) | `sessionOwnerWorkspace.ts` + post-commit sync in `sessionService.ts` |
| Tests + guards | `order-settlement-presentation/__tests__/` |

---

## Data flow (enforced)

```
Presentation (OrderSettlementPanel)
  → orderSettlement.* API
    → Projection Read Store
      → Write Model (committed)
```

Presentation never calls Domain, Aggregate, Repository, or Projection builders.

---

## Adoption targets

| Surface | Change |
|---------|--------|
| Check / Session Workspace | `OrderSettlementPanel` via `listByCheck` + `getSummaryByCheck` |
| Mark Paid / Complimentary / Close actions | Invalidate `orderSettlement.*` queries |
| Legacy session-event settlement summary | **Removed** |

Dashboard Revenue widgets remain on `reporting.*` (Check Revenue SSOT) — not Order Settlement Read Model (ADR-022).

---

## View Models

- Status labels for canonical statuses only (no inference)
- Amount **formatting** of API-provided strings (no recalculation)
- Error kinds: unauthorized / forbidden / notFound / projectionUnavailable / unexpected
- Optional projection metadata in DEV diagnostics

---

## Projection freshness (application, not Presentation)

In-process Projection store is hydrated so API reads succeed:

1. **Workspace open** — committed OS rows for `activeCheckId` materialize into the Read Store (failure-isolated).
2. **Post settle/void** — Session service uses `*Detailed` Check APIs and `tryMaterialize…` after commit.

Order Settlement Integration / Projection / API modules were **not redesigned**.

---

## Out of scope (confirmed)

No Domain · Persistence · Integration redesign · Projection redesign · OS API redesign · Reporting redesign · UI inventing financial rules.

---

## End-to-end architecture

```
Write Model → Projection → API → Presentation
```

Presentation is fully decoupled and replaceable without affecting Projection, API, Domain, or the Financial Settlement Platform.
