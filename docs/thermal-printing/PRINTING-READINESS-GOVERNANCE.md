# Printing Readiness Authority

Operator printing readiness must come from `printOps.getPrintingSetupStatus` only.

## Client rules

- Import selectors from `client/src/lib/printing/printingReadinessAuthority.ts`
- Never branch on `provisioning.step`, `emptyReason`, or `counts.activePrinters` for operator UX
- Legacy discovery fields live in `client/src/lib/printing/legacyPrintingDiscovery.ts` (support only)
- All test-print actions must use `canRunAuthorityTestPrint` / `canRunAuthorityTestPrintForPrinter`

## Server rules

- Readiness derivation: `server/printing/setupState/resolvePrintingSetupState.ts`
- Entry point: `getPrintingReadinessAuthority()` in `server/printing/printingReadinessAuthority.ts`
- `resolveProvisioningStep()` is legacy support diagnostics only
