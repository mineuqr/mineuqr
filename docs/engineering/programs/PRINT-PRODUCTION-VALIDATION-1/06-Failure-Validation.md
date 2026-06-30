# PRINT-PRODUCTION-VALIDATION-1 — Failure Validation

## Checklist

| Scenario | Canonical reason | Automated mapping | Physical test | Result |
|----------|------------------|-------------------|---------------|--------|
| No printer selected | `no_printer_selected` | ✓ | **Pending** | — |
| Printer offline / not in discovery | `printer_offline` | ✓ | **Pending** | — |
| Paper out | `paper_out` | Mapper regex ✓ | **Pending** | — |
| Permission denied | `permission_denied` | Mapper regex ✓ | **Pending** | — |
| Connection lost | `connection_lost` | Mapper regex ✓ | **Pending** | — |
| Timeout | `timeout` | Mapper regex ✓ | **Pending** | — |
| OS failure | `os_failure` | Default fallback ✓ | **Pending** | — |

## Expected Behavior

1. `PrintExecutionResult.success = false` with `failureReason` set.
2. `PrintResultPort.reportPrintFailure` → job transitions to `failed`.
3. Ops event `print_failed` emitted.
4. No raw OS stack traces exposed to workspace client (message is canonical string).

## Physical Procedures

| Test | Steps |
|------|-------|
| No selection | Print without selecting printer → expect UI error / failed job |
| Offline | Power off printer → discover or print → `printer_offline` |
| Paper out | Remove paper if detectable → print → `paper_out` if OS reports it |
| Disconnect USB | Unplug during print → `connection_lost` or `printer_offline` |
| Permission | Run API without print permission (if reproducible) |

## Automated Evidence

- `PrintFailureMapper` unit tests PASS.
- `PrintConnectorRuntime` returns structured failure for missing selection (unit test).

## Defects Found

| ID | Severity | Description |
|----|----------|-------------|
| PV-003 | Minor | OS-specific paper-out detection depends on driver; may map to `os_failure` |

## Section Verdict

**NOT CERTIFIED** — failure scenarios not exercised on hardware.
