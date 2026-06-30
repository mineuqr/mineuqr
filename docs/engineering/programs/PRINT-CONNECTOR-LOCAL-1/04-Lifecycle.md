# PRINT-CONNECTOR-LOCAL-1 — Lifecycle

---

## States

```
Stopped → Starting → Connecting → Authenticating → Registered → Healthy → Degraded
                                                                              ↓
Stopping → Stopped
```

Managed by `LocalConnectorHost` — authoritative for RLC process.

---

## Transitions

| Event | Transition |
|-------|------------|
| `beginStart` | → `starting` |
| Transport open | → `connecting` |
| Auth sent | → `authenticating` |
| Register success | → `registered` |
| Heartbeat success | → `healthy` |
| Heartbeat failure | → `degraded` |
| `beginStop` | → `stopping` → `stopped` |
