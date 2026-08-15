# 14 — ARCHITECTURAL GAPS

Defects documented only. No fixes in this program.

## P0 — architectural correctness / data safety

| ID | Gap |
|----|-----|
| P0-1 | Tap checkout sends Offer List Price **USD number** with currency **SAR**. Catalog regional SAR rows are unused. |
| P0-2 | `ensureLivePlanBoundForSubscription` never passes `billingCycleCode` → Charged Terms always snapshot **monthly** catalog price, including yearly checkouts. |
| P0-3 | Users **without** a subscription resolve entitlements from **`planFeatureMatrix`**, not Live Plan — a second commercial capability source. |
| P0-4 | **4 of 6** Production subscriptions have **no binding** → no Charged Terms; MRR cannot represent them. |

## P1 — production risk

| ID | Gap |
|----|-----|
| P1-1 | Webhook leftover integer READ still required; retirement **BLOCKED** (external program). |
| P1-2 | `createPlan` is not durable (memory only). |
| P1-3 | No plan delete / referential guard; SQL DELETE would orphan UUID FKs silently (no DB FKs). |
| P1-4 | PayPal `custom_id` omits billing cycle; webhook period end is always +1 month. |
| P1-5 | Provider capture amount never persisted to Charged Terms. |
| P1-6 | Entitlement test mock stale (`isLivePlanUuid` missing) — 4 failing tests. Guard comment drift (GUARD-IDENTITY-03). |

## P2 — maintainability

| ID | Gap |
|----|-----|
| P2-1 | No unhide UX; archive is `isHidden` only; no lifecycle enum. |
| P2-2 | `legacyPlanId` on public DTO and bindings column. |
| P2-3 | Dead webhook imports of `resolveLegacyPlanIdFromPlan`. |
| P2-4 | Stale runtime comment “Unbound → Legacy Bridge only” vs UUID unbound Live Plan path. |
| P2-5 | `data-integrity-audit` S5 still joins leftover `subscription_plans` (false positives). |

## P3 — future enhancement

| ID | Gap |
|----|-----|
| P3-1 | Regional prices / taxPolicyRef unused at checkout. |
| P3-2 | Promotions unused. |
| P3-3 | No plan versioning / entitlement versioning (live composition by design). |
| P3-4 | No Country Compliance / e-invoicing. |
| P3-5 | FX presentation not wired to stored SAR overrides. |

## Lifecycle model (proposal only — not implemented)

Retain UUID forever once referenced. Hide ≠ delete. Forbid delete while `user_subscriptions` or bindings reference the id. Durable create = `saveLive` only. Unhide via `isHidden: false`. Archive is visibility, not financial tombstone. Historical Charged Terms stay on bindings even if the offer changes.
