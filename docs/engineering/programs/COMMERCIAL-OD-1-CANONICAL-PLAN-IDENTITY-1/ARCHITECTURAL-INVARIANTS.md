# ARCHITECTURAL-INVARIANTS

Accepted with this decision:

**I-OD1-01**  
`commercial_plans.id` is the canonical internal Commercial Plan identity.

**I-OD1-02**  
`commercial_plans.code` is a business/catalog key, not a replacement for canonical identity unless separately approved.

**I-OD1-03**  
`subscription_plans.id` is not a canonical Commercial Plan identity.

**I-OD1-04**  
`legacyPlanId` is compatibility-only and MUST NOT determine price, capabilities, limits, MRR, or Charged Terms.

**I-OD1-05**  
`LEGACY_PLAN_BRIDGE` is not a permanent commercial authority.

**I-OD1-06**  
Provider transaction identifiers are not MineuQR Commercial Plan identifiers.

**I-OD1-07**  
Canonical Plan Identity is independent of price and customer Charged Terms.

**I-OD1-08**  
Canonical Plan Identity remains stable across normal catalog edits (`saveLive` preserves `id`; hide does not recycle `id`).

**I-OD1-09**  
No third internal Commercial Plan identity may be introduced.
