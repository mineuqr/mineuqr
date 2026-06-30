# PRINT-ARCHITECTURE-2 — Failure Recovery

**Date:** 2026-06-30

---

## AD-11: How is connector availability detected?

**Decision: Heartbeat + command acknowledgment on Connector Session.**

| Signal | Source | Cloud action |
|--------|--------|--------------|
| `Heartbeat` | RLC every N seconds | Update `lastSeenAt` |
| Session established | RLC register | Mark `online` |
| Session lost | Transport timeout | Mark `offline` after grace period |
| Command timeout | Gateway | Retry or fail job per policy |

**Workspace / Management** read connector presence from cloud projection (future read model or management API extension — no UI in this program).

Grace period default: **30s** without heartbeat → `degraded`; **90s** → `offline`.

---

## AD-12: How are connector failures reported?

**Decision: Canonical `PrintExecutionResult` end-to-end — no raw OS exceptions.**

| Failure | `failureReason` | Visible to |
|---------|-----------------|------------|
| RLC offline | `connector_offline` | Workspace, Printing Service |
| Printer not found | `printer_offline` | Workspace |
| Permission denied | `permission_denied` | Management diagnostics |
| OS spooler error | `os_failure` | Ops logs (sanitized message in UI) |
| Timeout | `timeout` | Printing Service retry policy |
| Unsupported capability | `unsupported_capability` | Management |

Flow:

```
RLC PlatformAdapter.deliverPrint()
    → failure mapped locally (existing PrintFailureMapper)
    → Gateway forwards PrintExecutionResult
    → Printing Service updates job state
    → OpsPrintStatusPublisher events
```

Connector registration failures → ops event `connector_registration_failed`.

---

## Recovery Actions

| Failure | Operator action | System action |
|---------|-----------------|---------------|
| RLC crashed | Restart agent | Auto-reconnect, drain queue |
| Wrong printer configured | Re-provision in Management | Cloud catalog update |
| Pairing expired | Re-pair from Management | New credential |
| Stuck job | Reprint from Workspace | New dispatch with new attempt |

---

## AD-13: Deployment independence preserved

Failures are reported through **existing contracts** (`PrintExecutionResult`, ops events). Deployment target changes do not change failure shape seen by Printing Service or Workspace.
