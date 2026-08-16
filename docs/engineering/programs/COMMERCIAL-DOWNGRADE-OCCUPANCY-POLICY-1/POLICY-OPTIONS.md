# POLICY OPTIONS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## OPTION A — FREEZE ALL EXISTING RESOURCES

Existing rows remain but become non-operational until occupancy ≤ cap.

**Rejected.** No freeze engine exists. Introducing restaurant/menu/POS freeze solely to satisfy a new cap would be an implementation shortcut, not a product requirement. Conflicts with “do not auto-freeze without decision.”

## OPTION B — EXISTING OPERATE, BLOCK NEW CAPACITY

Existing rows remain valid and usable. New quantity-consuming creation is rejected while `proposedTotal > effective cap`.

**Selected.** Matches `checkLimit` + occupancy helper + G-10 COUNT. No debt table. Capacity returns through delete / POS deactivate / certified replace.

Boundary: `allowed = proposedTotal <= cap`. Create uses `occupancy + 1`, so create is denied while `occupancy >= cap`. Create becomes permitted when `occupancy + 1 <= cap`.

## OPTION C — FORCE DEACTIVATION

Automatically deactivate excess resources until occupancy ≤ cap.

**Rejected.** For catalog, G-10 says inactive still occupies, so deactivation would not restore compliance. For POS it would silently unprovision tenant hardware. User surprise and data-ownership risk.

## OPTION D — FORCE DELETION

Automatically delete excess resources.

**Rejected.** Extremely high risk. No product requirement. A Commercial downgrade is not permission to mutate tenant-owned data.

## OPTION E — GRACE PERIOD

Temporary over-cap operation, then apply another policy.

**Rejected.** No product requirement. Would require grace tables/flags. G-10 already forbids inventing grace Commercial.

## OPTION F — BILLING / ADD-ON CONVERSION

Convert excess capacity to paid add-ons.

**Future scope.** Not supported by the current occupancy architecture. Do not invent add-on occupancy here.

## OPTION G — RESOURCE-CLASS DOWNGRADE SYSTEM

Different downgrade engines per resource class.

**Rejected as a second Commercial system.** Catalog vs POS already differ by **G-10 occupancy set**, not by a separate downgrade policy. Both classes follow B: do not mutate existing rows; block new capacity consumption.

## Candidate vs proof

The program’s default candidate was B. Proof: create paths already used `checkLimit(occupancy + 1)`; bind/saveLive do not mutate domain rows; G-08 P10 left existing rows in place; G-10 COUNT is unchanged by downgrade. The only mismatch was POS replace at over-cap, which is occupancy-neutral and is now allowed.
