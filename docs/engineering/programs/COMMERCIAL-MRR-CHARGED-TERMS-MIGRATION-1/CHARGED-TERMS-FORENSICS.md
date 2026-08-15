# CHARGED-TERMS-FORENSICS

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1  
**As of:** 2026-08-15

## Sufficiency verdict

**Charged Terms are sufficient to calculate MRR without `subscription_plans` or Live Plan list price.**

Required fields exist on the binding row:

| Need | Field | Location |
|------|-------|----------|
| Recurring amount | `chargedAmount` | `commercial_subscription_bindings.chargedAmount` (decimal 12,2, nullable) |
| Currency | `chargedCurrency` | varchar(8), nullable — catalog writes USD |
| Billing cycle | `billingCycleCode` | varchar(64), nullable — `monthly` / `yearly` |
| Subscription link | `subscriptionId` | unique index — one binding per subscription |

`CommercialChargedTerms` (`shared/commercial-catalog/types/chargedTerms.ts`) also carries `intervalUnit`, `intervalCount`, plan identity, and period bounds. MRR does **not** need plan identity or catalog interval lookup.

## Storage

| Item | Value |
|------|-------|
| Table | `commercial_subscription_bindings` |
| Schema | `server/db/schema/commercial/bindings.ts` |
| Canonical read | `getSubscriptionCommercialBinding` |
| Capability + terms assembly | `resolveLivePlanCapabilities` (touches Live Plan for **capabilities / cycle catalog**, not used by MRR) |

## Snapshot / versioning / nullability

- One current binding per `subscriptionId` (unique). No Charged Terms version history table.
- `chargedAmount` / `chargedCurrency` / `billingCycleCode` are **nullable**.
- Read path already refuses to invent terms: if `chargedAmount` is missing, `resolveLivePlanCapabilities` returns `chargedTerms: null` (no list-price substitute).
- **Write** path `chargedTermsForPlan` still snapshots the **then-current** Live Plan offer. This program does **not** change bind / renewal / upgrade write semantics.

## Currency

Charged Terms are USD-native (ADR-035). MRR is USD-native (ADR-036). This program does not introduce FX. Non-USD `chargedCurrency` contributes **0** (`UNSUPPORTED_CURRENCY`).

## Production rows

COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1 (2026-08-14, read-only):

| Table | Count | Classification |
|-------|-------|----------------|
| `user_subscriptions` | 5 | test / internal / owner — **0 real customers** |
| Paid invoices | 0 | — |
| `commercial_subscription_bindings` | **0** | no Charged Terms rows |

Architecture Authority: no real legacy customers and no real historical customer subscriptions requiring commercial contract preservation.

This program does not fabricate customer history. Missing Charged Terms on an otherwise eligible owner contribute **0** (`INCOMPLETE_CHARGED_TERMS`). No backfill. No catalog reconstruction.

## What MRR must not use from this layer

| Source | Why |
|--------|-----|
| `resolveLivePlanCapabilities` | Loads Live Plan for capabilities / cycle catalog |
| `chargedTermsForPlan` | Current catalog snapshot — write-time only |
| `planId` on the binding | Live Plan identity, not the contracted amount |
| `legacyPlanId` | Compatibility handle |

MRR reads **binding columns only** via `loadChargedTermsForMrr`.
