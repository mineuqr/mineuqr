# LIFECYCLE MATRIX

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Verified against G-10. No rewrite.

| Resource | Transition | Occupancy | Commercial primitive? |
|----------|------------|-----------|------------------------|
| Restaurant | `isActive` false/true | Still occupies | No (not a slot change) |
| Category | `isActive` false/true | Still occupies | No |
| Item | `isAvailable` false/true | Still occupies | No |
| POS | register | Consumes | Yes, delta 1 |
| POS | registered → active | No change (already provisioned) | No |
| POS | deactivated → active | Consumes | Yes, delta 1 |
| POS | deactivate | Releases | No wrap (COUNT drops) |
| POS | replace provisioned | Unchanged | Yes, delta 0 |
| POS | replace deactivated | Consumes | Yes, delta 1 |
| POS | replaced row | Does not occupy | — |

No `archived` / `disabled` enum on catalog quantity rows. CRMP register deactivate is **not** POS terminal occupancy.

Any transition that **increases** effective occupancy uses the shared helper (POS reactivate, create, replace-from-deactivated).
