# PRINT-CONNECTOR-LOCAL-1 — Diagnostics

---

## Snapshot

`LocalConnectorDiagnostics.snapshot(host)` returns:

- **Identity** — full runtime identity
- **Configuration** — cloud endpoint, heartbeat interval, deployment type
- **Gateway connection** — connected flag, connection ID
- **Session** — session state
- **Health** — current health snapshot
- **Deployment** — platform, architecture, deployment type

Suitable for operator support tooling and RLC installer verification.
