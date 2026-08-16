# PLAN CHANGE BEHAVIOR

Technical occupancy and commercial product policy stay separate.

## Current (unchanged)

Cap always comes from the **current** Live Plan. Occupancy is COUNT of existing rows.

Example: cap 5 → 5 resources → plan changes to cap 2.

| Question | Actual / decision |
|----------|-------------------|
| Preserve existing? | **Yes** (A) |
| Freeze excess? | **Not defined** — defer (E) |
| Deactivate excess? | **No** — do not invent |
| New creates? | Denied when `COUNT+1 > new cap` |

POS: operations continue while `posTerminals` included > 0 even if provisioned > cap (predecessor).

## Occupancy primitive must not

- Rewrite resources on `saveLive`  
- Auto-delete  
- Auto-deactivate  
- Snapshot old caps into an occupancy table as a freeze flag  

After implementation, COUNT vs new cap is enough for **block new creation**. Freeze remains a **separate Commercial product program**.
