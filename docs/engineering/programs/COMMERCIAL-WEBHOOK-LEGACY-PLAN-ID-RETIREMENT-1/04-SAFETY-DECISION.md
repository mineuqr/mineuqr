# 04 — SAFETY DECISION

## Classification (exactly one)

**B. NOT PROVEN SAFE**

Evidence is insufficient to close the leftover integer webhook READ.

## Why not A (SAFE TO RETIRE)

SAFE requires proof that no legitimate in-flight/replay integer payloads remain within the applicable retention/replay window.

Missing proofs:

- Provider-side pending PayPal orders: **not inventoried** (API not called)
- Provider-side pending/INITIATED Tap charges: **not inventoried** (API not called)
- Provider retry/retention window: **UNKNOWN** (not guessed)
- Historical webhook bodies: **not stored**, so traffic cannot be classified as zero
- Elapsed time since UUID writers: **~46 minutes** at evidence — same day as integer writers

UNKNOWN must not be converted into SAFE.

## Why not C (STILL REQUIRED)

STILL REQUIRED means **known** legitimate integer payloads remain. This program did not observe a concrete in-flight integer payload. Possibility is not the same as a counted remainder.

The stop condition “integer webhook payloads are still **legitimately possible**” is nevertheless true, and is why implementation is forbidden.

## Stop condition mapping

| Stop condition | Applies? |
|----------------|----------|
| Provider replay/retention cannot be established and no acceptable evidence exists | **Yes** |
| Integer webhook payloads are still legitimately possible | **Yes** (same-day writer cutover; provider objects not inventoried) |
| Existing webhook event records cannot be classified | **Yes** — there are **no** stored webhook records to classify |
| Migration / `bindings.legacyPlanId` / `subscription_plans` / MRR / Charged Terms / provider redesign / destructive DDL required | No — not reached |

## Implementation gate

Phase 5–9: **NOT ENTERED**.

Integer webhook READ remains:

PayPal/Tap → `parseWebhookPlanRef` → `resolveCanonicalLivePlanId` (UUID **or** leftover integer via `LEGACY_PLAN_BRIDGE`).
