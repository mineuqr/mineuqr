# G-11 SMOKE

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** read-only Policy B evidence. No Production downgrade.

## Policy B (deployed)

`checkLimit()` compares `proposedTotal` to the **current** effective cap. There is no plan-change path that deletes, freezes, deactivates, rewrites, or converts existing resources.

`occupancyDelta === 0` may proceed through a hard `limit_exceeded` (POS replace). New capacity-consuming operations (`occupancyDelta === 1`) use the current cap.

## Known leftover (unchanged)

| userId | restaurants occupancy | current cap |
|--------|----------------------|-------------|
| 1 | **2** | **1** |

This is the certified G-11 leftover. Not repaired. Not used as a mutation target.

No other restaurant / category / item / POS over-cap.

## Result

**G-11 PASS** — Policy B leftover remains; no downgrade test was executed.
