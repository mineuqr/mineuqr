# MRR INTEGRITY

Canonical MRR is unchanged in this program:

```
qualifying subscription
  → Charged Terms
  → monthly equivalent
```

Implementation: `CanonicalMetricsService.computeMrrFromStates` → `loadChargedTerms` → `computeMrrFromChargedTerms`.

Qualifying means:

1. Owner in **COMMERCIAL** population (`accountClassification === "COMMERCIAL"`). INTERNAL/SYSTEM are excluded from certified KPIs.
2. `commercialStatus.countsInMrr === true` (BASIC / PROFESSIONAL / ENTERPRISE participation; not TRIAL/ADMIN/NONE).
3. `subscriptionId` present.
4. Charged Terms row present with amount > 0, USD, monthly or yearly cycle.

Missing Charged Terms → contribution **0**. Live Plan current price is **not** read.

## Production qualifying walk (SELECT 2026-08-15T15:17:10.073Z)

Evaluated as of query time (server_ts `2026-08-15T12:17:11.000Z`).

| id | Population | Entitled now? | countsInMrr plan? | CT present? | amount>0 | currency | cycle | Monthly equivalent |
|----|------------|---------------|-------------------|-------------|----------|----------|-------|--------------------|
| 600001 | INTERNAL — excluded | no (period elapsed) | professional yes, but excluded | no | — | — | — | **0** |
| 690001 | COMMERCIAL | no (elapsed) | professional | no | — | — | — | **0** (also not entitled / not canonical) |
| 750001 | COMMERCIAL | no (elapsed) | professional | no | — | — | — | **0** |
| 810001 | COMMERCIAL | no (expired) | basic yes | yes 19.00 | yes | USD | monthly | **0** (not entitled; CRS canonical is 840001) |
| 840001 | COMMERCIAL | **yes** | enterprise **yes** | **yes 99.00** | yes | USD | monthly | **99.00** if this owner is in KPI batch |
| 780001 | INTERNAL — excluded | yes (period through 2027) | enterprise | **no** | — | — | — | **0** (excluded + incomplete CT) |

Do not reconstruct 780001 or 750001 from catalog 99 / 999.

Canonical pick for user 14760004 is 840001. Certified commercial MRR from this population, if 840001's owner is included, is **99.00** from Charged Terms — not from Live Plan list price as a fallback.

780001 cannot contribute to certified commercial MRR without (a) COMMERCIAL population membership and (b) valid Charged Terms. Neither is true.
