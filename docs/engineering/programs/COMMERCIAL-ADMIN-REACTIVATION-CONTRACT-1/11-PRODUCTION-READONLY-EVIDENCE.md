# 11 — PRODUCTION READ-ONLY EVIDENCE

**Mutation: NONE.** SELECT only. Queried `2026-08-15T19:05:59.000Z` server time. `DATABASE()=mineuqr`. Journal 0090 (`bd9989fa…`).

| Item | Value |
|------|--------|
| Subscriptions | **8** (was 7 at prior lifecycle SELECT) |
| Bindings | **4** |
| Charged Terms | **1** |
| Concessions | **0** |
| Status mix | 5 `active`, 2 `canceled`, 1 `expired` |

Paid Admin create is live: subscription `900001` has Snapshot #1, `source=admin_create`, Professional monthly **$29.00**, `effectiveFrom` `2026-08-15T19:04:20Z`. Binding leftover on that row also $29 — leftover is a copy, not authority.

Termination candidates (no Charged Terms):

| Row | DB status | Cycle | Snapshot | Binding leftover |
|-----|-----------|-------|----------|------------------|
| 810001 | `expired` | monthly | none | $19 |
| 840001 | `canceled` | monthly | none | $19 |
| 870001 | `canceled` | monthly | none | $29 |

`810001` has `currentPeriodEnd` still in the future; `db_expired` still turns entitlement off.

Read-time expired (`status=active`, period already past, no snapshot): `600001`, `690001`, `750001`.

`780001`: unchanged — `active` / yearly / enterprise / period end `2027-06-21` / no snapshot / unbound.

**Forensic meaning:** a status-only “reactivate” of `840001` / `870001` would restore entitlement with **no snapshot** and **MRR 0**. Binding $19/$29 must not become the commitment. Model B would insert Snapshot #1 from the **current** Live Plan offer, not from leftover.

No row was reactivated by this program. Raw JSON is not committed.
