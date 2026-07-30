# Production Verification Report

**Program:** CAPABILITY-EXCLUDED-FORENSICS-1

Legend: ✓ present as **this capability’s product** · ~ related code owned elsewhere · — absent

| Check | CAP-14 | CAP-18 | CAP-38 | CAP-39 | CAP-44 | CAP-45 |
|-------|:------:|:------:|:------:|:------:|:------:|:------:|
| Production routes (product) | — | — | — | — | — | — |
| Production services (named package) | — | — | — | — | — | — |
| Production APIs | — | — | — | — | — | — |
| Production UI (customer/merchant) | — | — | — | — | — | — |
| Admin architecture UI | — | — | ✓ arch | ✓ arch | — | — |
| Database tables (owned by CAP) | — | —* | — | — | — | — |
| Runtime usage as CAP | — | — | — | — | — | — |
| Feature flags / entitlements in code | — | — | — | — | — | —† |
| Integration / E2E as CAP product | — | — | — | — | — | — |
| Architecture guards / docs tests | ✓ ADR | ✓ ADR | ✓ | ✓ | ✓ docs | ✓ docs |
| Real customer product usage | — | — | — | — | — | — |

\* CRMP attribution tables exist under **CAP-16**, not CAP-18.  
† Entitlement **names** reserved in Subscription architecture docs only — not in Runtime matrix / FEATURE_KEYS / Projection.

### Related production (must not double-count)

| Related surface | Canonical owner |
|-----------------|-----------------|
| Check / Split / Refund / SR / MCA | CAP-08–13 |
| CRMP / Shift / Attribution | CAP-16 / CAP-17 |
| Order outbox / relay / consumers | CAP-01 / CAP-40 |
| Realtime observability metrics | CAP-28 |

### Verdict

No excluded CAP has an independent **production product surface** warranting Canonical Registry membership today.
