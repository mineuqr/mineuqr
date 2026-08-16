# POS DOWNGRADE ANALYSIS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

POS uses the shared Commercial occupancy primitive. No POS-specific downgrade system.

## Occupancy set (G-10, unchanged)

Provisioned = `registered` + `active`.  
`deactivated` releases.  
`replaced` does not occupy.  
Replace of a provisioned terminal: `occupancyDelta = 0`.

## After cap 5 → 3 with 5 provisioned

| Question | Answer |
|----------|--------|
| Do existing active terminals keep operating? | Yes. No POS freeze. |
| Can a new terminal be provisioned? | No. `occupancyDelta = 1` and `5 + 1 > 3`. |
| Can a deactivated terminal be reactivated? | Only if current provisioned COUNT + 1 ≤ cap. |
| Can a terminal be replaced? | Yes. `occupancyDelta = 0`. Occupancy stays 5. |
| Does replacement remain occupancyDelta 0? | Yes. Certified model unchanged. |
| Does deactivation still release occupancy? | Yes. |

## Pre-G-11 gap

`checkLimit(occupancy)` with occupancy 5 and cap 3 returned hard `limit_exceeded`, so replace was denied even though it does not consume a slot. That was an accidental `proposedTotal <= cap` application to a non-increasing mutation.

**Fix:** `isNewCapacityDenial` — occupancyDelta 0 + hard `limit_exceeded` is not a new-capacity denial. `not_entitled` / unsupported still fail closed.

## TiDB

Fixture table `occupancy_g07_terminals` (stagIn has no `pos_terminals`).

- provisioned 2, cap 1: new provision rejected; rows remain.
- deactivate one: provisioned 1; further provision at cap 1 rejected.
- replace at occupancy 2 / cap 1 with occupancyDelta 0: allowed; provisioned stayed 2.
