# PLAN / SUBSCRIPTION AUDIT

Existing Commercial policy. Occupancy implementation **did not** add freeze/downgrade behavior.

## Limit increases

New creates allowed until COUNT+1 > new cap. Existing rows unchanged.

## Limit decreases / occupancy already above cap

| Question | Actual |
|----------|--------|
| Existing resources remain? | **Yes** (not deleted/deactivated) |
| New creates? | `checkLimit` deny when proposedTotal > cap |
| Automatic freeze of excess? | **Absent** |
| POS operate when provisioned > cap but cap > 0? | Entitlement **read** still derives remaining slots; operations of existing terminals are not occupancy-gated per sale |

## Expiration / NONE plan

`lifecycleEnablesEntitlements` false → plan NONE / zeroed limits → `checkLimit` deny. Occupancy lock still serializes; both concurrent creates fail on cap.

## Upgrade / concession / charged terms

Cap is always **current** Live Plan via `resolveOwnerEntitlements`. Occupancy helper re-reads `checkLimit` after the lock.

## Freeze

**Not implemented.** Architecture predecessor: defer product freeze. This audit: **C. POLICY DECISION REQUIRED** — not a technical occupancy bug.

Do not label missing freeze as REQUIRED NOW unless product mandates freeze-on-downgrade.
