# SAFE-DELETE-READINESS

**Is `subscription_plans` ready for a separate SAFE DELETE program?**

**NO — LIVE DEPENDENCIES REMAIN** (ORM helpers, schema, seeds/scripts, integer identity, leftover tests).

| Gate | Met? |
|------|------|
| 1. Zero application reads | **Almost** — helpers exist, routers do not call them |
| 2. Zero application writes | **Almost** — `createSubscriptionPlan` unused |
| 3. Zero API dependencies | Yes for price/name/MRR; integer `planId` remains |
| 4. Zero webhook table reads | **Yes** |
| 5. Zero invoice table reads | **Yes** |
| 6. Zero notification table reads | **Yes** |
| 7. Zero admin table price reads | **Yes** |
| 8. Zero trial table reads | **Yes** |
| 9. Zero scripts | **No** |
| 10. Zero ORM runtime | **No** |
| 11. Zero seeds | **No** |
| 12. Zero tests requiring table | **No** (mocks remain) |
| 13. No FK/runtime | `user_subscriptions.planId` is not a formal FK; identity remains |
| 14–15. No real customer contracts | Yes (prior forensics + AA) |
| 16–19. Live Plan / Charged Terms / MRR / Checkout independent | **Yes** |
| 20. AA deletion approval | Not requested |

SAFE DELETE is a **separate** gated program.
