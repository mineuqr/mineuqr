# CONCESSION LIFECYCLE

States: `active` | `superseded` | `expired` | `cancelled`

No other states.

## Grant

Immediate. `startsAt = now`. `endsAt` from calendar math. Version = latest + 1. Source `admin_grant`.

Identical unit+duration while current → return the current row (idempotent).  
Different grant while current → `overlap`.

## Revise / extend / shorten

Requires a current concession. Inserts a new `active` version from `now` with the new unit/duration. Prior current row: `status=superseded`, `supersededBy=newId`. Duration/dates on the prior row are not rewritten.

A shorten that would end at or before `now` is rejected (`shorten_in_past`).

Identical unit+duration+reason while current → return the current row.

## Cancel

Current row: `status=cancelled`, `cancelledAt=now`. Row is not deleted. Grant facts remain.

Idempotent when no current concession: returns the latest historical row.

## Expiration

Read-time. `isConcessionCurrent` is false when `now >= endsAt` even if the stored status is still `active`. No background job is required for MRR or invoice suppression to stop.

## One current concession

Only one row can be current: latest `active` row with `now < endsAt`. Unique `(subscriptionId, version)` plus the grant overlap check plus a SQL transaction prevent two current versions.
