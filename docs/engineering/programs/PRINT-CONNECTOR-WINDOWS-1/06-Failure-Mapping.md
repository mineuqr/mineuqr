# PRINT-CONNECTOR-WINDOWS-1 — Failure Mapping

---

## Print Failures → Infrastructure

`mapPrintFailureToInfrastructure()` maps `PrintFailureReason` to `InfrastructureFailureCode`:

| Print reason | Infrastructure code |
|--------------|---------------------|
| `printer_offline` | `connector_unavailable` |
| `no_printer_selected` | `connector_unavailable` |
| `paper_out` | `connector_unavailable` |
| `permission_denied` | `authentication_failure` |
| `timeout` | `transport_unavailable` |
| `connection_lost` | `transport_unavailable` |
| `os_failure` | `connector_unavailable` |

---

## Windows Error Messages

`mapWindowsErrorMessage()` pattern-matches native error text for access denied, timeout, offline, paper out, driver errors.

---

## Existing PrintFailureMapper

`server/print-connector/runtime/PrintFailureMapper.ts` — OS-level patterns shared with adapter layer.
