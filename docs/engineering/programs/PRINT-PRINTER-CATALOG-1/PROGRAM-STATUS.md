# PRINT-PRINTER-CATALOG-1 — Program Status

**Date:** 2026-06-30  
**Authority:** ADR-ARCH-017 v1.1  
**Status:** **COMPLETE** (implementation)

---

## Exit Criteria

| Criterion | Status |
|-----------|--------|
| `restaurant_printers` is the only Printer Catalog authority | ✓ |
| `print_connector_selections` retired from production architecture | ✓ (no reads/writes in cloud path) |
| Query APIs are side-effect free | ✓ |
| Discovery cannot mutate catalog | ✓ (verified + guarded) |
| Deleted printers never auto-restore | ✓ |
| Provision is the only Observation → Administrative Intent transition | ✓ |
| Architecture guards pass | ✓ |
| ADR-ARCH-017 fully implemented (software) | ✓ |

---

## Architecture Risks (Remaining)

| Risk | Severity | Notes |
|------|----------|-------|
| `print_connector_selections` table still exists in schema | Low | Retired from runtime; drop in future schema program (ADR M-4) |
| Operators must run migration before cutover on existing deployments | Medium | Documented in IMPLEMENTATION.md |
| RLC in-memory selection not yet reconciled on catalog delete | Low | Cloud commands carry explicit `printerId`; delete does not require RLC deselect in v1 |
| `DrizzlePrinterSelectionRepository` file retained for reference/tests only | Low | Not wired in production composition |

---

## Recommended Next Decision

| Program | Purpose |
|---------|---------|
| **PRINT-PRODUCTION-VALIDATION-2** | End-to-end certification with real hardware |
| **Schema cleanup program** | Drop `print_connector_selections` after migration verification |
| Update ADR-ARCH-017 implementation status in registry | After deployment sign-off |

---

## Executive Summary

PRINT-PRINTER-CATALOG-1 implements ADR-ARCH-017 v1.1 in software. The Printer Catalog is now exclusively owned by `restaurant_printers`. Legacy selection persistence is retired from the production cloud path. Read APIs are pure. Deleted printers no longer reappear via query-time migration.

**PRINT-PRINTER-CATALOG-1 COMPLETE**
