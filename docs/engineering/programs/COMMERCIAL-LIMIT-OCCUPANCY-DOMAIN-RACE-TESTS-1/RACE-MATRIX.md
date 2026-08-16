# RACE MATRIX

Classification key: **A** PASS · **B** REQUIRED NOW · **C** POLICY DECISION · **D** SAFE TO DEFER · **E** SHOULD NEVER BE INTRODUCED

| ID | Workflow | Actors | Result vs `occupancy <= cap` | Class |
|----|----------|--------|------------------------------|-------|
| R1 | Last-slot concurrent restaurant create | 2 pools | 1 success, 1 exceeded, COUNT=2 | A |
| R2 | Last-slot category / item create | 2 pools | COUNT=cap | A |
| R3 | At-cap concurrent restaurant create | 3 attempts | 0 persisted, COUNT=cap | A |
| R4A | Create starts, then delete | 2 pools | COUNT <= cap, COUNT = rows | A |
| R4B | Delete starts, then create | 2 pools | COUNT <= cap | A |
| R4C | Create ∥ delete | 2 pools | COUNT <= cap | A |
| R4D | At-cap create ∥ delete | 2 pools + extra create | COUNT=2, never 3 | A |
| R5 | Category hard-delete ∥ category create | 2 pools | COUNT <= cap; no orphan items | A |
| R6A | Two POS replaces (`delta=0`) | 2 pools | 1 provisioned | A |
| R6B | Replace ∥ hard-delete | 2 pools | provisioned COUNT <= 1 | A |
| R6C | Deactivate ∥ provision | 2 pools | provisioned COUNT <= 1 | A |
| R7A | Same idempotency key replay | 2 pools | 1 resource, 2 fulfilled (replay) | A |
| R7B | Conflicting fingerprint | 1 | fail closed, COUNT=0 | A |
| R7C | Catalog create idempotency | n/a | does not exist | D (G-12) |
| R8A | Concurrent onboarding, distinct emails | 2 pools | 1 restaurant each | A |
| R8B | Concurrent same email | 2 pools | 1 unique owner row | A |
| R9 | Admin category/item skip | source | can exceed cap by policy | C (G-09) |
| R10 | Create vs plan cap drop | 2 pools | create-time cap honored; leftover occupancy may exceed **new** cap | C (G-11) |
| R11 | Delete occupancy accounting | source + races | COUNT only | A |
| R12 | Restaurant delete ∥ category create | 2 pools | orphan category after parent gone; occupancy of **live** tenants still <= cap | D / cascade gap |
| R13 | Cross-tenant creates | 3 owners | 1 each; distinct lock PKs | A |
| R14 | COUNT/lock then later create | source | live paths do not split; onboarding is a documented exception | A |
| R15 | Failure after insert / related insert | injected | rollback COUNT=0 | A |
| R16 | Two OS processes last slot | 2 processes | COUNT=2 | A |

No row is **B**. No occupancy > cap was observed.
