# FAILURE-AND-ANOMALY-FINDINGS

**No IDENTITY-REMEDIATION-REQUIRED findings.**

`anomalies` in `_QUERY-EVIDENCE.json`: **[]**

Noted (not blockers):

- Population changed since 2026-08-14 (5 → 7 rows; 30001 appeared; 30003 ×2; bindings 0 → 2). Current data still maps.
- Five subscriptions remain unbound. Integers still resolve. Do not bind in this program.
- Five column-status `active` rows include stale 30002 periods (all four 30002 rows have ended periods). Status hygiene is not identity mapping.
- Eight invoices exist, all `pending`. Zero `paid`. Not a mapping defect.
