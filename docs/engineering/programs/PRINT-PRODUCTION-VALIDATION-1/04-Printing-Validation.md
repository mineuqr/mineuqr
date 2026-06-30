# PRINT-PRODUCTION-VALIDATION-1 — Printing Validation

## Checklist

| # | Criterion | Automated | Physical | Result |
|---|-----------|-----------|----------|--------|
| 1 | Test print (workspace Print action) | Flow exists ✓ | **Pending** | — |
| 2 | Execution result reported | `PrintExecutionResult` + job status ✓ | **Pending** | — |
| 3 | Customer order → Printing Service | `OrderPrintingConsumer` wired ✓ | **Pending** | — |
| 4 | Print job created in DB | `print_jobs` schema ✓ | **Pending** | — |
| 5 | Connector invoked | `PrintingServicePrintConnectorAdapter` ✓ | **Pending** | — |
| 6 | Ticket on physical printer | OS delivery path ✓ | **Pending** | — |

## End-to-End Paths

### Operator Print (Workspace)

```
PrintWorkspacePanel → printWorkspace.commands.printOrder
  → PrintWorkspaceCommandService → PrintingService.requestPrint
  → PrintDispatchCoordinator → PrintConnectorPort.submit
  → PrintConnectorRuntime.print → OS
```

### Order Event Print (Automatic)

```
OrderCreated / OrderReady → OrderPrintingConsumer
  → OrderPrintDispatchAdapter → PrintingService (idempotent)
  → same dispatch path
```

**Note:** Automatic print requires order present in `order_read_*` projections when event fires.

## Test Print Procedure (Manual)

1. Ensure printer selected (see §03).
2. Select an order in Print Workspace.
3. Click **Print**.
4. Verify:
   - `print_jobs` row created (`pending` → `printing` → `printed` or `failed`).
   - Ops events: `print_requested`, `print_dispatched`, `print_started`, `print_completed` or `print_failed`.
   - Physical ticket output readable on printer.

## Customer Order Procedure (Manual)

1. Place order via customer flow.
2. Confirm order appears in Print Workspace (projection lag ≤ normal poll interval).
3. If auto-print on `OrderCreated`/`OrderReady` enabled via consumer: verify job without manual Print.
4. Otherwise use manual Print.
5. Compare ticket content to order (items, total, table, notes).

## Automated Evidence

- 26 printing-related unit tests PASS.
- `PrintConnectorPort` unchanged; dispatch order: dispatched → printing → connector submit → result port.

## Defects Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| PV-001 | **Major** | No dedicated test-print endpoint; operators must use order Print | Documented |
| PV-002 | **Major** | Payload is plain text, not thermal-optimized ESC/POS | Known limitation |
| — | — | No critical code defects found in automated review | — |

## Section Verdict

**NOT CERTIFIED** — physical print not validated.
