# PLAN-COMPOSITION-GOVERNANCE.md

Live Plan is the only commercial composition source (CE-02, I-CE-02).

Forbidden duplicate systems (CE-10, I-CE-08):

- ScreenPlanMatrix / KitchenPlanMatrix / OrderPlanMatrix / POSPlanMatrix
- OwnerPlanMatrix / FeaturePlanMatrix / DEVICE_PLAN_MATRIX
- Endpoint-specific `if plan === ...` authorization

`planFeatureMatrix` remains a Legacy Bridge artifact for **unbound** customers only. Owner simulation and bound customers MUST NOT fall through to it for new commercial operations.

If a second mapping appears necessary: STOP. Request an Architecture Decision.
