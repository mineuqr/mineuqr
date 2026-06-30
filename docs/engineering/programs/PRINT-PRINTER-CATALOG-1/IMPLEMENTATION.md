# PRINT-PRINTER-CATALOG-1 — Implementation

**Date:** 2026-06-30  
**Authority:** ADR-ARCH-017 v1.1 · ADR-ARCH-016  
**Status:** Complete (software)

---

## Objective

Implement canonical Printer Catalog architecture: single SSOT (`restaurant_printers`), pure reads, coordinated delete, ephemeral discovery, explicit provision-only registration, legacy selection retirement.

---

## Implemented Changes

### 1. Printer Catalog ownership (`restaurant_printers` only)

| Component | Change |
|-----------|--------|
| `PrinterManagementService` | Catalog reads via `RestaurantPrinterRepository` only; no legacy fallback |
| `printerManagementComposition` | Removed `DrizzlePrinterSelectionRepository` from cloud wiring |
| `GatewayRoutedPrintConnectorApi` | Removed cloud selection persistence; gateway sync only |

### 2. Read purity (ADR Rule RP-1)

**`getCurrentPrinter()`** — removed read-path migration that called `connector.getSelectedPrinter()` and `printers.save()`.

Now:

```typescript
const printer = await this.printers.getDefault(restaurantId);
// pure read + optional live status from RLC
```

**`testPrint()`** — uses `getDefault` / `findByPrinterId` directly instead of side-effecting `getCurrentPrinter`.

### 3. Selection contract (derived state)

| Before | After |
|--------|-------|
| `print_connector_selections` cloud SSOT + migration fallback | **Retired** from production cloud path |
| `GatewayRoutedPrintConnectorApi.getSelectedPrinter()` | Always returns `null` on cloud |
| `selectPrinter()` | RLC gateway sync only; no `saveSelection` to DB |

RLC runtime retains `InMemoryPrinterSelectionRepository` as ephemeral execution cache (ADR-ARCH-017 §3 Rule SSOT-3).

### 4. Delete contract

`removePrinter` unchanged in API but now effective without re-migration:

- `isActive = false`, `isDefault = false`
- Promotes next active default when needed
- `setDefault` now requires active catalog row (`findByPrinterId` guard)

### 5. Provision contract

`provisionPrinter` remains the **only** path creating/updating active catalog rows (plus explicit one-time migration job).

`save()` upsert `isActive: true` applies only via provision command — not via reads.

### 6. Discovery contract

No code changes required — discovery paths already read-only. Architecture guards assert no catalog writes in discovery services.

### 7. Legacy retirement

| Artifact | Role |
|----------|------|
| `LegacyPrinterSelectionMigrator` | One-time programmatic migration |
| `scripts/migrate-legacy-printer-selections.ts` | Runnable migration entrypoint |
| `drizzle/0050_migrate_legacy_printer_selections.sql` | SQL migration (M-1) |
| `printConnectorComposition` | Switched embedded runtime to `InMemoryPrinterSelectionRepository` (no cloud DB selection writes) |

Migration rules:

- Skip if restaurant already has active default
- Skip if printer was soft-deleted (`isActive = false` for same `printerId`)
- Otherwise copy legacy row into catalog via `provision`-equivalent `save`

### 8. Architecture guards

New: `server/printer-management/__tests__/catalog.architecture.guards.test.ts`

Enforces:

- No `getSelectedPrinter` in `PrinterManagementService`
- No writes inside `getCurrentPrinter` body
- No `DrizzlePrinterSelectionRepository` in printer management composition
- No `PrinterSelectionRepository` in `GatewayRoutedPrintConnectorApi`
- Embedded connector uses in-memory selection only
- Discovery read service does not touch catalog

Updated: `discovery.architecture.guards.test.ts` for selection repository removal.

### 9. Tests

| File | Coverage |
|------|----------|
| `PrinterManagementService.test.ts` | Pure read, no migration, delete + poll stability |
| `LegacyPrinterSelectionMigrator.test.ts` | Skip when active default exists |
| `catalog.architecture.guards.test.ts` | ADR structural compliance |

---

## Removed Legacy Behavior

| Removed | Impact |
|---------|--------|
| `getCurrentPrinter` → `getSelectedPrinter` → `save` migration | Fixes deleted printer reappearance |
| Cloud dual-write to `print_connector_selections` on provision/default | Single catalog authority |
| `DrizzlePrinterSelectionRepository` in printer management composition | No cloud selection SSOT |
| Embedded `DrizzlePrinterSelectionRepository` in `printConnectorComposition` | No accidental cloud DB selection from API host |

---

## Files Changed

| Path | Change |
|------|--------|
| `server/printer-management/services/PrinterManagementService.ts` | Pure reads, testPrint fix |
| `server/printer-management/printerManagementComposition.ts` | Remove selection repo |
| `server/printer-management/infrastructure/DrizzleRestaurantPrinterRepository.ts` | `setDefault` active guard |
| `server/printer-management/infrastructure/LegacyPrinterSelectionMigrator.ts` | **New** |
| `server/connector-gateway/adapters/GatewayRoutedPrintConnectorApi.ts` | No cloud selection persistence |
| `server/print-connector/printConnectorComposition.ts` | In-memory selection |
| `server/print-connector/infrastructure/persistence/InMemoryPrinterSelectionRepository.ts` | **New** |
| `drizzle/0050_migrate_legacy_printer_selections.sql` | **New** |
| `scripts/migrate-legacy-printer-selections.ts` | **New** |
| `server/printer-management/__tests__/*` | Tests + guards |
| `server/print-workspace/__tests__/discovery.architecture.guards.test.ts` | Updated guards |

---

## Operational Notes

1. Run `npm run db:migrate` to apply `0050_migrate_legacy_printer_selections.sql`
2. Or run `tsx scripts/migrate-legacy-printer-selections.ts` for programmatic migration
3. `print_connector_selections` table remains in schema for audit; **production code no longer reads or writes it**

---

## ADR Compliance Matrix

| ADR-ARCH-017 Rule | Status |
|-------------------|--------|
| SSOT-1 One catalog authority | ✓ |
| SSOT-2 No parallel selection store (cloud) | ✓ |
| DISC-1..8 Discovery rules | ✓ (unchanged + guarded) |
| DEL-1 Coordinated delete | ✓ |
| RP-1 Read purity | ✓ |
| INV-PC-01..17 | ✓ (software) |
| M-1 One-time migration | ✓ (script + SQL) |
| M-2 Remove query migration | ✓ |
| M-3 Stop dual-write | ✓ |
