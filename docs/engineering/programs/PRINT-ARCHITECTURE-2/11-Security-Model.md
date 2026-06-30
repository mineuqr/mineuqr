# PRINT-ARCHITECTURE-2 — Security Model

**Date:** 2026-06-30

---

## Threat Model

| Threat | Mitigation |
|--------|------------|
| Unauthorized browser prints | Existing session + `assertRestaurantAccess` |
| Rogue agent impersonates restaurant | Pairing code + issued credential; revocable |
| Cross-tenant print routing | Gateway routes by authenticated `restaurantId` only |
| LAN exposure of connector | No inbound ports; outbound session only |
| Credential theft on restaurant PC | Scoped credential; rotate; OS user permissions |
| Man-in-the-middle | TLS on all cloud paths; cert pinning optional for agent |
| Operator discovers other tenant printers | Impossible — RLC bound to one `restaurantId` |

---

## Data Classification

| Data | Sensitivity | Location |
|------|-------------|----------|
| Print payload (order details) | Business confidential | Transient on RLC during print |
| Connector credential | High | RLC secure store + cloud hash |
| Printer catalog | Medium | Cloud DB |
| Pairing code | High, short-lived | Cloud, single use |

---

## Principle of Least Privilege

| Actor | Grants |
|-------|--------|
| Browser operator | Restaurant-scoped UI APIs |
| RLC agent | Print/discover/status for one `restaurantId` only |
| Printing Service | Internal port — no external exposure |

---

## RLC Host Hardening (Operational Guidance)

- Dedicated Windows user for agent service
- Auto-start on boot
- No RDP-exposed admin on print PC
- Firewall: deny inbound; allow outbound HTTPS only

---

## Audit

All connector events include: `restaurantId`, `connectorInstanceId`, `correlationId`, `timestamp` — aligned with existing ops taxonomy.
