# PRODUCTION-DATA-CLASSIFICATION

Aggregates only. No names, emails, or openId values.

| planId | status | accountClassification | role | identityKind | Count |
|-------:|--------|-----------------------|------|--------------|------:|
| 30001 | expired | COMMERCIAL | user | local_openid_prefix | 1 |
| 30002 | expired | COMMERCIAL | user | local_openid_prefix | 1 |
| 30002 | active | COMMERCIAL | user | local_openid_prefix | 2 |
| 30002 | active | INTERNAL | admin | non_local_openid_prefix | 1 |
| 30003 | active | INTERNAL | admin | non_local_openid_prefix | 1 |
| 30003 | active | COMMERCIAL | user | local_openid_prefix | 1 |

| Class | Count |
|-------|------:|
| INTERNAL admin | 2 |
| COMMERCIAL + local openId prefix (dev/test identity pattern) | 5 |
| Paid invoices | **0** |
| Stripe subscription ids | **0** |
| Trial rows | **0** |

No paid customer contract exists. COMMERCIAL-classified rows use the local openId prefix previously treated as test/dev. They still map deterministically; they do not require special migration logic.
