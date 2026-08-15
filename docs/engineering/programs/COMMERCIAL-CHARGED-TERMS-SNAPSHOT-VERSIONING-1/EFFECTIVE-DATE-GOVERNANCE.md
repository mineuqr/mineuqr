# EFFECTIVE-DATE GOVERNANCE

This program supports **immediate** commercial changes only.

`effectiveFrom = mutation commit time` (`nowIso()`).

Future-dated, renewal-scheduled, and complimentary-window changes are **not** implemented. Rejecting a future `effectiveFrom` is implicit: callers do not accept a future timestamp input.

Trial status-only updates do not create snapshots.
