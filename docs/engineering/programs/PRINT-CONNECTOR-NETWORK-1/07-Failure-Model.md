# PRINT-CONNECTOR-NETWORK-1 — Failure Model

---

## Canonical Infrastructure Failures

Defined in `sessionFailureContracts.ts`:

| Code | When |
|------|------|
| `authentication_failure` | Invalid/revoked credential, tenant mismatch |
| `registration_failure` | Session mismatch, gateway registration error |
| `transport_unavailable` | No connection, command timeout, disconnect |
| `session_expired` | Unknown session, credential expired |
| `connector_unavailable` | Session not ready, heartbeat rejected |
| `heartbeat_timeout` | Liveness threshold exceeded |
| `version_mismatch` | Connector version below minimum |
| `duplicate_session` | Superseded by newer connection |

---

## Mapping to Gateway

Gateway `routePrint` maps execution failures to:

- `connector_unregistered`
- `connector_offline`
- `transport_unavailable`

Infrastructure codes are preserved in execution port `failureReason` / `message` fields.

---

## No Business Failures

Infrastructure failures are distinct from print job failures (`reportPrintFailure`). This layer never interprets order or print policy.
