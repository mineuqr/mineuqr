# GOVERNANCE-COMPLIANCE.md

Complies with COMMERCIAL-ENTITLEMENT-ENFORCEMENT-GOVERNANCE-1 / Constitution v1.0.

| Rule | Application |
|------|-------------|
| Limits are commercial authority | Hub `checkLimit` + Live Plan `commercial_limit_values` |
| UI is not authorization | Editor is presentation; router + `saveLive` + create enforce |
| Server enforcement mandatory | `assertRestaurantCreateAllowed` before persist |
| Customer admin is not a commercial grant | Admin skip removed |
| No plan-name authorization | No `if (plan === "basic")` quota |
| No second quota matrix | Live Plan limits for bound customers |
| Negative tests mandatory | Invalid save, at-cap deny, admin cannot skip, NONE deny |

## I-LIMIT-01…14

| ID | Invariant | Status |
|----|-----------|--------|
| I-LIMIT-01 | Limits are distinct from Capabilities | Verified (editor + contracts) |
| I-LIMIT-02 | Live Plan Limits are the runtime source for Live Plan customers | Verified |
| I-LIMIT-03 | Limits are editable in the authorized Plan Editor | Verified |
| I-LIMIT-04 | Limit changes are validated before persistence | Verified |
| I-LIMIT-05 | Plan, price, capability, and limit changes persist atomically | Verified |
| I-LIMIT-06 | Customer admin does not bypass commercial limits | Verified |
| I-LIMIT-07 | Platform Owner FULL_PLATFORM is unlimited | Verified |
| I-LIMIT-08 | SIMULATED_PLAN uses selected Live Plan limits | Verified |
| I-LIMIT-09 | FROZEN cannot create commercial resources | Verified (prior Frozen + still true) |
| I-LIMIT-10 | Unlimited is canonical `null` | Verified |
| I-LIMIT-11 | Legacy quota sources cannot override Live Plan runtime | Isolated |
| I-LIMIT-12 | Changing a limit does not require code changes | Verified |
| I-LIMIT-13 | Limit changes invalidate runtime caches | Verified |
| I-LIMIT-14 | Restaurant creation is enforced server-side | Verified |

These invariants are **program-local**. They are not silently written into the Entitlement Constitution.

## Governance gap (follow-on)

Constitution v1.0 is capability-centric (`requireFeature`, CE-01…30). It does not yet explicitly define:

- editable Live Plan **Limits / Quotas** as a first-class commercial authority
- `checkLimit` as the mandatory operation-boundary equivalent of `requireFeature`
- I-LIMIT-01…14 as constitutional invariants

**Recommendation:** a follow-on governance program to extend the constitution with Limits/Quotas without weakening CE-01…30.

Do not treat this repair as a silent constitution amendment.
