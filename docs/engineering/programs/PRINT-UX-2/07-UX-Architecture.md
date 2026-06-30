# PRINT-UX-2 — UX Architecture

**Authority:** ADR-ARCH-016 v1.2 · Architecture Evolution Policy

---

## Layering

| Layer | Responsibility |
|-------|----------------|
| UI components | Presentation only |
| `viewModels.ts` | Labels, uptime, health tone |
| Hooks | tRPC query orchestration |
| `PrintWorkspacePresenceReadService` | Gateway → operator DTO projection |
| Gateway / Session / RLC | Unchanged |

---

## Health State Model

`WorkspaceHealthState`: healthy, connected, warning, degraded, disconnected, offline, unregistered

Mapped to badge tones: ok, warn, bad, muted

---

## Polling

- Connector + session: 30s
- Orders list: 10s (unchanged)

---

## Guards

`ux.architecture.guards.test.ts` — no platform imports, no JSON.stringify in workspace panel, presence service read-only.
