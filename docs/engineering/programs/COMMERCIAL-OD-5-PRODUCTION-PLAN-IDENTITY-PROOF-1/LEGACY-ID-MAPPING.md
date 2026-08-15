# LEGACY-ID-MAPPING

## Repository bridge

| Integer | Code | Key |
|--------:|------|-----|
| 30001 | basic | BASIC |
| 30002 | professional | PROFESSIONAL |
| 30003 | enterprise | ENTERPRISE |

No duplicate integers. No duplicate codes.

## `PLAN_ID_TO_CATALOG_PLAN`

30001→BASIC, 30002→PROFESSIONAL, 30003→ENTERPRISE.  
**Agrees exactly** with the bridge keys.

## Production integers vs bridge

Every production integer is in the bridge.  
No production integer maps to more than one code.  
No test-only integers (`1`, `102`, `0`) exist in production.
