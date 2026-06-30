# PRINT-ARCHITECTURE-2 — Discovery Lifecycle

**Date:** 2026-06-30

---

## AD-2: Who owns printer discovery?

**Decision: RLC executes discovery; Cloud owns the provisioned catalog.**

| Phase | Owner | Action |
|-------|-------|--------|
| **Execute discovery** | RLC | `PlatformAdapter.discoverPrinters()` on host OS |
| **Present to operator** | Cloud (via gateway) | Returns live snapshot to UI |
| **Persist selection** | Cloud Printer Management | `restaurant_printers` row + capabilities snapshot |
| **Operational read** | Cloud | `getCurrentPrinter` reads catalog + requests live status via RLC |

Discovery is **not** cached as SSOT. The catalog is SSOT for **configured** printers.

---

## Lifecycle Flow

```
1. Operator opens Add Printer (Browser → Cloud)
2. Cloud sends DiscoverPrinters to RLC for restaurantId
3. RLC runs native OS discovery (Get-Printer / lpstat / etc.)
4. Results return to Cloud → Printer Selection UI
5. Operator selects printer
6. Cloud requests capabilities from RLC for printerId
7. Cloud provisions → restaurant_printers + connector selection sync
8. Operator runs Test Print → Cloud → RLC → OS
9. Ready — workspace shows current printer from catalog + live status
```

---

## Failure Modes

| Condition | Behavior |
|-----------|----------|
| RLC offline | Empty discovery list + canonical `connector_offline` — **no simulated printers** |
| OS discovery error | Empty list + ops warning on RLC — **no silent simulation** |
| Printer removed from OS | Status `printer_offline`; catalog row remains until admin removes |
| Stale catalog | Diagnostics compare catalog vs live discovery |

---

## Multi-Device Discovery

Any authorized browser triggers the same cloud command → same RLC → same OS view. No per-browser discovery state.

---

## Embedded Mode (Non-Production)

`embedded` discovery on API host remains for dev/CI only — not the distributed production path.
