# 10 — PRODUCTION CUTOVER PLAN

OD-3 is an **application contract** change. No DDL.

## Readiness (this program)

- Tests: 112/112 on the OD-3 set
- Build: PASS
- Production storage already UUID (OD-2 / 0088)
- Webhook leftover **read** retained for in-flight integer metadata

## Deploy sequence (AA-owned — not executed)

```
READINESS → TESTS → BUILD
  → PRODUCTION READ-ONLY PROOF (existing OD-2 / forensics)
  → PROVIDER IN-FLIGHT: dual-read is the mitigation
  → DEPLOY APP
  → POST-CUTOVER: new checkouts write UUID; leftover webhook read still works
  → CERTIFICATION
```

This program did **not** deploy.

In-flight integer payloads are **not** a blocker because leftover read remains. Deploy-first of UUID writers is safe against leftover-integer webhooks.
