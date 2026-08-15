# SUBSCRIPTION LIFECYCLE CONTRACT

Plan capability and subscription lifecycle are **orthogonal**. Expiry architecture remains authoritative. Do not redefine FROZEN through these keys.

## Composition

| Account state | Capability ON | Capability OFF |
|---------------|---------------|----------------|
| ACTIVE | Allowed (then RBAC + domain) | `requireFeature` deny on gated ops |
| FREE CONCESSION (commercially ACTIVE) | Same as ACTIVE | Same as ACTIVE+OFF |
| CANCELED / EXPIRED → FROZEN | Existing expiry policy **wins** | Existing expiry policy **wins**; capability is not evaluated as a substitute |

## Plan change (A → B)

Capability state follows the **current entitled Live Plan** (`user_subscriptions.planId` → bundle).

- Effective on next entitlement resolve after the plan identity change (immediate; no Charged Terms).
- Existing menus, items, designs, QR identities, sessions: **preserved**.
- Public render / QR resolution: **continue** (subject to FROZEN).
- Management UI: hide/disable OFF capabilities.
- B → A: management access **returns**. No new snapshot. No data restore needed because nothing was deleted.

## Forbidden

- Writing capability flags into Charged Terms.
- Treating concession as capability ON.
- Treating expiry as `smartQr` / `menuDesign` OFF.
- Deleting data on plan downgrade.
