# POST-CUTOVER-VALIDATION

Queried after apply. SELECT only. Mutation: none beyond 0088.

## Schema

`user_subscriptions.planId` = `varchar(36)` NOT NULL. `planIdUuid` absent.

## Journal

0088 applied once (`6084102`). Latest hash prefix `0836fac35ca3515d`.

## Rows

Before 7 = after 7. Distinct ids 7. Lost 0. Duplicate 0. NULL planId 0. Orphan 0. Non-UUID 0.

## Identity

| code | UUID | n |
|------|------|--:|
| basic | `79cf7bf7-c3b6-45de-8f20-42897cd493ac` | 1 |
| professional | `0ade795a-02fa-4d3e-b9b5-262515bade09` | 4 |
| enterprise | `d836bd10-9d9f-4408-a076-f921354d785a` | 2 |

## Status

active 5 · expired 2 · trial 0 · canceled 0 (unchanged).

Contract nulls: userId 0 · restaurantId 0 · billingCycle 0 · period start/end 0. monthly 6 · yearly 1.

## Bindings

2 rows. Disagreement 0. Charged amount present 2.
