# PRINT-ARCHITECTURE-2 — Deployment Topology

**Date:** 2026-06-30

---

## Approved Deployment Models

### D1 — Cloud API (always)

- Multi-tenant SaaS
- Printing Service, Printer Management, Workspace APIs
- Connector Gateway (logical component — future implementation)
- **Does not** execute OS print I/O in production restaurants

### D2 — Restaurant Local Connector (RLC) (production default)

| Target | Host | Role |
|--------|------|------|
| `local_desktop` | Windows/macOS/Linux PC at restaurant | Primary production path |
| `android` | Tablet / kiosk on premises | Future mobile path |
| `edge` | Dedicated appliance on LAN | High-volume / unattended sites |
| `embedded` | Same process as API | **Dev, CI, same-machine lab only** — not restaurant production |

### D3 — Browser (any device)

- Thin client to cloud only
- No connector installation in browser
- Multiple simultaneous browsers per restaurant supported

---

## Topology Diagram

```
                    Internet
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    [Browser A]   [Browser B]   [Browser C]
    (Windows)     (Android)     (macOS)
         │             │             │
         └─────────────┼─────────────┘
                       │ HTTPS /api/trpc
                       ▼
              ┌─────────────────┐
              │  MineuQR Cloud   │
              │  API + Gateway   │
              └────────┬─────────┘
                       │ Connector Session (outbound from site)
                       ▼
              ┌─────────────────┐
              │ Restaurant LAN   │
              │  RLC Host (D2)   │──── USB / Ethernet ──── Printer
              └─────────────────┘
```

---

## Environment Matrix

| Environment | Connector placement | Discovery |
|-------------|---------------------|-----------|
| Production restaurant | RLC on premises | Host OS via RLC |
| Cloud-only staging | `embedded` on API VM | VM printers only (limited) |
| Developer laptop (all-in-one) | `embedded` optional | Local OS (dev convenience) |
| CI / tests | `simulated` / in-process mocks | No OS |

---

## Decision

**Production restaurants MUST use D2 (RLC).** Embedded cloud discovery is explicitly non-production for distributed SaaS.
