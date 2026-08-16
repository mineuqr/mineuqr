# FINDINGS

Every finding has exactly one class.

## A. PASS — correctly race-safe

- Last-slot and at-cap creates for restaurants, categories, items, POS provision
- Create vs delete / hard-delete (occupancy = COUNT, never > cap)
- POS replace vs replace and replace vs hard-delete (`occupancyDelta=0`)
- POS deactivate vs provision
- Idempotency replay and conflicting fingerprint (where keys exist)
- Distinct-owner onboarding and unique email
- Cross-tenant isolation (lock PK is tenant-scoped)
- Failure rollback
- Two OS-process last slot
- Live owner/admin restaurant create uses the helper (no COUNT-then-later-create split)

## B. REQUIRED NOW

None. No race produced `occupancy > cap`.

## C. POLICY DECISION

| ID | Finding |
|----|---------|
| G-09 | Admin category/item create skips quantity occupancy |
| G-10 | Inactive restaurants/categories and unavailable items still occupy COUNT |
| G-11 | After plan cap drop, existing COUNT may exceed the **new** cap; create-time cap still holds |

## D. SAFE TO DEFER

| ID | Finding | Why occupancy-safe if left |
|----|---------|----------------------------|
| G-12 | No catalog create idempotency keys | Helper still caps COUNT; duplicates below cap are UX |
| Cascade TOCTOU | Child row can commit after parent restaurant delete | Does not raise live-tenant occupancy above cap; no FK |
| Parent re-read in occupancy tx | Shared existence check | New architecture, not a cap fix |
| POS concurrent double-activate of same deactivated terminal | May false-deny | Fail closed; COUNT still <= cap |
| `staffAccounts` / `branches` / `devices` quantity occupancy | No live COUNT create path | |

## E. SHOULD NEVER BE INTRODUCED

- POS occupancy table or POS-specific lock
- Second occupancy counter / decrement ledger
- Redis / app-memory / global locks
- Hiding orphans from COUNT to “fix” cascade
- Bypassing Commercial checks to make a race pass
- Applying 0091/`pos_terminals` or tax columns to stagIn as a G-08 “fix”
- Wrapping onboarding in the occupancy helper by splitting user+restaurant+trial
