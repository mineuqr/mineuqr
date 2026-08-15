# NEGATIVE-TEST-GOVERNANCE.md

A capability is not certified by Professional → allowed alone (CE-14).

Required where applicable:

| Case | Must prove |
|------|------------|
| Entitled | Operation allowed |
| Not entitled (e.g. Basic) | Operation denied |
| Expired / FROZEN | Operation denied |
| Invalid / unavailable entitlement | Fail closed |
| Direct API bypass | Denied |
| UI bypass | Denied at API |

Tests MUST reach the operation boundary (CE-15): UI → API → authorization → mutation → persistence, with the check **before** persist.

Certified `devices` suite: `deviceCapabilityEnforcement.matrix.test.ts` and related repair tests.
