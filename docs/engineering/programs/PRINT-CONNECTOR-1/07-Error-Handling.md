# PRINT-CONNECTOR-1 — Error Handling

## Canonical Failure Reasons

`PrintFailureReason` enum covers:

- `printer_offline`
- `no_printer_selected`
- `paper_out`
- `permission_denied`
- `connection_lost`
- `timeout`
- `unsupported_capability`
- `os_failure`
- `cancelled`
- `unknown`

## Mapping

`PrintFailureMapper.ts` converts OS/transport errors to canonical reasons. OS exception messages are **not** leaked to workspace clients as raw stack traces — they are wrapped in `PrintExecutionResult.message`.

## Runtime Guards

| Condition | Result |
|-----------|--------|
| No selection | `no_printer_selected` |
| Printer not in discovery | `printer_offline` |
| Unknown transport | `unsupported_capability` |
| OS command failure | Mapped via `mapErrorToPrintFailureReason` |

## Ops

Failures reported to Printing Service via `PrintResultPort.reportPrintFailure` → job `failed` state + `print_failed` ops event.
