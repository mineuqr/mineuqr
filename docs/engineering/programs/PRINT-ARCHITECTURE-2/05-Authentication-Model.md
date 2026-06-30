# PRINT-ARCHITECTURE-2 — Authentication Model

**Date:** 2026-06-30

---

## AD-8: How are authentication and trust established?

**Decision: Three trust domains with restaurant-scoped connector credentials.**

### Domain A — Operator Browser → Cloud

- Existing MineuQR session (cookie / verified user)
- `assertRestaurantAccess` on all print tRPC procedures
- **Unchanged**

### Domain B — RLC → Cloud (Connector Registration)

| Element | Purpose |
|---------|---------|
| **Pairing token** | One-time QR/deep-link or admin-generated code binds RLC to `restaurantId` |
| **Connector credential** | Long-lived scoped secret or certificate issued after pairing |
| **Instance identity** | `connectorInstanceId` + `deploymentTarget` + host fingerprint |
| **Rotation** | Admin can revoke / re-pair from Printer Management |

RLC presents credential on session establishment. Gateway rejects unknown or revoked connectors.

### Domain C — Cloud → RLC (Command trust)

- Commands accepted only on **authenticated sessions** from Domain B
- Every command carries `restaurantId`, `correlationId`, `issuedAt`, `nonce`
- RLC rejects commands for mismatched `restaurantId`

---

## AD-9: How is restaurant isolation guaranteed?

| Mechanism | Enforcement |
|-----------|-------------|
| Pairing | Credential bound to single `restaurantId` |
| Routing | Gateway indexes sessions by `restaurantId` |
| Command validation | RLC validates tenant on every command |
| Catalog | `restaurant_printers` rows scoped by `restaurantId` |
| Printing Service | Jobs carry `restaurantId`; dispatch never crosses tenants |
| Audit | Ops events include `restaurantId` + `connectorInstanceId` |

**Cross-tenant routing is architecturally impossible** — gateway lookup is keyed by tenant.

---

## Trust Levels

| Level | Who | Can discover | Can print | Can manage catalog |
|-------|-----|--------------|-----------|-------------------|
| Operator (browser) | Human session | Via cloud→RLC | Via cloud jobs | Yes (cloud) |
| RLC agent | Machine credential | Local OS | Local OS | No business rules |
| Cloud Printing Service | Internal | No | Via port adapter | No |

---

## Revocation

- Admin revokes connector → gateway drops session → discovery/print fail with canonical `connector_offline`
- Operator session unchanged; workspace shows connector unavailable
