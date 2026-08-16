# PRODUCTION READINESS

## This program

| Gate | Status |
|------|--------|
| Production mutation | **0** |
| Production migrate | **NOT RUN** |
| Production seed | **NOT RUN** |
| Deploy | **NONE** |

`0091_pos_terminals` is journalized locally so repository governance stays consistent. It must not be applied until a separate apply program authorizes it.

## Fail-closed before seed

Existing Live Plans have no `posTerminals` rows. After code deploy without seed, non-admin provisioning is denied (quantity 0). That is the approved fail-closed behavior.

Do **not** seed from this program. Do **not** call `replaceIncludedFeatures` for POS.

## Follow-up program

`POS-DOMAIN-PRODUCTION-APPLY-1` (or equivalent) must:

1. Apply `0091` under migration governance
2. Insert-only `commercial_limit_values` for `posTerminals` on Live Plans (preservation quantities decided by commercial authority)
3. Leave Charged Terms, prices, and `user_subscriptions` untouched

## Check OCC

Phase 1 does not mutate Check. Header `version` is still absent.

**FOLLOW-UP:** Check OCC if required before concurrent financial mutation.
