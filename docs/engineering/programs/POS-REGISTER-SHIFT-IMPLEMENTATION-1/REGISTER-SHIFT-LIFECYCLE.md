# REGISTER / SHIFT LIFECYCLE

```
Register catalog: provisioned → active ⇄ inactive
Register duty:    closed → open ⇄ suspended → closed
Financial Shift:  open → suspended | closing | handover_pending | closed → archived
```

Financial Shift may open only when catalog is `active` and duty is `open`.

Settlement Context (ADR-ARCH-030):

- Closed duty → gap `register_duty_closed`
- No active shift → gap `no_active_shift`
- Check settle remains fail-open if called without hints
- POS settlement **refuses to call Check** unless context is fully resolved (same operational rule as Counter Pickup, without reusing that façade)
