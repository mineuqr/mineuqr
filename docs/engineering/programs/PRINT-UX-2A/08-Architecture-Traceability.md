# PRINT-UX-2A — Architecture Traceability

---

## Depends on

PRINT-UX-2, PRINT-GATEWAY-1, PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-LOCAL-1

---

## New / Modified

| Path | Change |
|------|--------|
| `operationalViewModels.ts` | Operational + provisioning state machine |
| `useOperationalPrintStatus.ts` | Unified distributed read hook |
| `SystemReadyBanner.tsx` | System ready hero |
| `LocalConnectorCard.tsx` | Operator connector step |
| `CurrentPrinterCard.tsx` | Operator printer step |
| `ConnectorSessionCard.tsx` | Compact session line |
| `PrinterSelectionDialog.tsx` | State-driven provisioning |
| `PrintWorkspacePanel.tsx` | Operational hierarchy |

---

## Guards

`ux.architecture.guards.test.ts` — PRINT-UX-2A section

`operationalViewModels.test.ts`
