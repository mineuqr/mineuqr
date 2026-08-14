# SECURITY-VALIDATION.md

Covered by `server/platform-owner-access/__tests__/*` and UI guards.

| # | Case | Result |
|---|------|--------|
| 1 | Owner + FULL_PLATFORM | All `FEATURE_KEYS` |
| 2–4 | Simulated Basic / Professional / Enterprise | Current Live Plan only |
| 5–6 | Professional → Basic, Basic → Enterprise | Immediate entitlement change |
| 7 | Return to Full Platform | All capabilities |
| 8–9 | Invalid / missing plan | Denied |
| 10–12 | Non-owner admin / customer / staff | FORBIDDEN |
| 13 | Expired 600001 | FULL_PLATFORM still works; subscriptions not read |
| 14–15 | No 600001 mutation / no binding | Source + hub guards |
| 16 | Customer isolation | Customer path unchanged |
| 17 | Cache isolation | Distinct keys + targeted invalidation |
| 18 | Unauthenticated | UNAUTHORIZED |
