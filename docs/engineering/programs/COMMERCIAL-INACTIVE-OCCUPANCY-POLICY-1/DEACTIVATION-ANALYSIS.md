# DEACTIVATION ANALYSIS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

| Resource | Deactivation | Capacity released? |
|----------|--------------|--------------------|
| restaurant / category / item flags | no | **No** — still in COUNT(*) |
| POS `active`/`registered` → `deactivated` | yes | **Yes** — no longer provisioned |
| Hard delete | yes | **Yes** — row gone |

## Why catalog does not release

Inactive ≠ deleted. Releasing on hide would be Option B (slot farming).

## CREATE ∥ DEACTIVATE (catalog, cap=1)

TiDB: create rejected, occupancy 1 after concurrent `isActive=0`. Inactive still counted; no extra slot.

## POS CREATE ∥ DEACTIVATE

G-08 P4: provision vs `provisioned=0` keeps occupancy ≤ cap. G-10: after deactivate, a new provision succeeds and provisioned COUNT=1.
