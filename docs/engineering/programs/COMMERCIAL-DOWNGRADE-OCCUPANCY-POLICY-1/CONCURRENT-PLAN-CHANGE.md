# CONCURRENT PLAN CHANGE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Question

Can a create observe the old cap while a downgrade commits the new lower cap?

**Yes.** The occupancy mutex serializes occupancy-consuming creates against each other. It does not lock the Commercial binding or live-plan limits.

## Accepted boundary

`decide()` uses the cap observed at decide time.

| Ordering | Result |
|----------|--------|
| Downgrade commits, then create `decide()` | Create sees new cap. Denied if `occupancy + 1 > new cap`. Existing rows remain. |
| Create commits, then downgrade | Create may succeed under old cap. Occupancy may exceed new cap. Further creates denied. |
| Overlap | Occupancy never exceeds the **old** cap (create-time invariant). Occupancy **may** exceed the **new** cap if `decide()` already authorized under the old cap. |

This is Policy B leftover occupancy, not an architecture gap. Closing it would require redesigning Commercial plan writes into the occupancy transaction. Not done.

## TiDB evidence

Independent pools (`pool` + `poolB`), mineuqr-stagIn, G07_DATABASE_URL.

**Sequential**

- Downgrade then create: rejected, occupancy 1.
- Create then downgrade: occupancy 2, new cap 1, further create rejected.

**Overlap** (create delay 400ms ∥ `UPDATE cap = 1`)

- occupancy 1
- new cap 1
- create rejected
- `occupancyMayExceedNewCap: false` on this run (`decide()` observed the new cap)

G-08 P10 previously recorded the leftover case (`occupancy > newCap` after cap drop). Both outcomes are legal under the decide-time cap.

## Not acceptable (and not observed)

A create that `decide()`s against the **new** cap and still inserts `occupancy + 1 > new cap`. Occupancy lock + READ COMMITTED COUNT prevent that among creates.
