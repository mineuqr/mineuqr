# ADR-POS-ACCESS-01: Restaurant Staff Access Boundary

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-TERMINAL-ACCESS-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

Keep `assertRestaurantAccess` owner/admin-only. Add POS-owned `assertRestaurantPosScope` so a non-owner may enter the POS domain only with a restaurant-scoped POS grant.

## Rejected

| Alternative | Why |
|-------------|-----|
| Weaken `assertRestaurantAccess` globally | Breaks tenant management guarantees |
| Full restaurant RBAC | Separate platform; STOP condition |
| All authenticated staff | No staff table; would fail open |
