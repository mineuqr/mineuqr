# CONCURRENCY

Check settlement initiation already uses optimistic concurrency via outcome CAS (`UPDATE … WHERE outcome='open'`). This program does not add a competing Check `version` field.

| Race | Behavior |
|------|----------|
| Same idempotency key, concurrent | Exclusive lock → one `settleCheckPaidByIdDetailed`, one replay |
| Different keys, Check already paid | First command that observes `paid` is rejected as `check_already_terminal` (no second mutation) |
| Lost CAS (`CheckTransitionError`) while Check is now `paid` | Return the canonical paid Check. No second financial mutation. |
| Lost CAS and Check is not paid | `concurrency_conflict` |

Terminal outcomes cannot regress through this command. Complimentary and voided Checks are rejected before settle.
