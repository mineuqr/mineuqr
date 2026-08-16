# IDEMPOTENCY AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Do not add keys unless a correctness gap exists. None found that requires new keys.

| Path | Behavior |
|------|----------|
| POS register with code | `resolveExisting` returns the non-replaced row; no second slot |
| POS register without code | New identity; occupancy helper serializes |
| POS replace | No replay key; concurrent replace G-07 P9 / G-08 P6 keeps occupancy 1 |
| Owner/admin create | Not idempotent by key; last-slot races use occupancy lock |
| Onboarding | Email uniqueness; same email rejected |

G-08 P7: replay same fingerprint → one resource; conflicting fingerprint fail-closed; occupancy 0/1 as designed.
