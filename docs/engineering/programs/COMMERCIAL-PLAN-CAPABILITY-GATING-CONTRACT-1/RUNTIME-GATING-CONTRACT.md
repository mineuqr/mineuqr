# RUNTIME GATING CONTRACT

## Canonical mechanism

`requireFeature(userId, "<canonical-key>")` from `server/subscription-runtime/enforcement.ts`.

UI `hasFeature` is presentation only. Direct tRPC without the server gate is a defect.

## Actual evaluation order (code ownership — do not invent)

Inspected current stack. **Do not reorder** to “owner first as middleware.” Owner exemption already lives **inside** the entitlement hub (`resolveOwnerEntitlements` / `ENV.ownerOpenId`).

Contracted order for gated restaurant procedures:

1. Authentication (`protectedProcedure` / equivalent)
2. Email verification (where already required)
3. Commercial account lifecycle — FROZEN denylist (`assertCommercialAccountActive`) where already applied
4. Restaurant / RBAC access
5. **`requireFeature(ownerUserId, canonicalKey)`** — commercial entitlement
6. Domain rules (quotas, uniqueness, FROZEN-specific QR/menu public policy)

`requireFeature` must use the **restaurant owner** user id (same as devices), not the acting staff id.

## Fail-closed

Missing bundle key = not entitled = deny. After cutover seed, absence is a real OFF.

## What requireFeature is not

- Not a quota (`checkLimit`)
- Not Charged Terms
- Not FROZEN / expiry
- Not RBAC
- Not a client flag

## Adapter coverage

Production adapter today: **devices only**. Implementation must extend the adapter / `FEATURE_KEYS` so the four keys resolve from the same hub. Do not add a second matrix.

## Error

Denied mutations: existing commercial entitlement denial (`COMMERCIAL_ENTITLEMENT_DENIED` / FORBIDDEN). No silent success. No empty 200 that pretends to persist.

## Reads

Public render / public QR resolution: **not** gated by these four keys (see PUBLIC-VS-MANAGEMENT). Management reads: per capability contract.

## Security (authorization, not presentation)

Reject:

- UI-only gating
- Client-provided `enabled` / plan name / feature map
- Trusting browser plan data
- `if (plan === "basic")` (or any plan-name conditional) as authorization
- Hardcoded customer IDs
- Admin / owner **role** as a commercial grant (today `category.create` / `menuItem.create` skip quota for `role === "admin"`; `updateTemplate` / colors / fonts skip subscription for admin — **role must not skip `requireFeature`**)
- Bypass through an alternate procedure that writes the same store

The server resolves capability state from Live Plan bundle → hub only.
