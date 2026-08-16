# PRODUCTION READINESS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Readiness only. **No deploy. No Production connection.**

| Item | Status |
|------|--------|
| 0094 on Production | Applied (prior program evidence). Compatible with helper `INSERT IGNORE` + `FOR UPDATE` |
| Application occupancy code | In working tree; **not deployed** (G-02 / Production Certification) |
| Fail-closed without deploy | Current Production app without occupancy adopters does not require lock rows; 0094 empty table is additive |
| Fail-closed after future deploy | Missing DB → `CommercialOccupancyUnavailableError`; missing/NONE cap → deny |
| Feature availability | Quantity creates already exist; deploy adds serialization, not a new product flag |
| Ordering | Schema 0094 already first. App deploy is the next certified step |
| Production mutation this audit | **0** |
| stagIn mutation | Synthetic G-07…G-11 owners / fixture tables only |

## Compatibility

Application expects table `commercial_limit_occupancy_locks` with PK `(scopeKind, scopeId, limitKey)`. Production has that table. No 0095. Do not migrate in this program.
