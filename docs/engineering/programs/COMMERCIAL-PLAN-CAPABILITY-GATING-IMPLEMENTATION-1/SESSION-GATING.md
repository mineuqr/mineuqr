# SESSION GATING

**Key:** `sessionTableManagement`

Gated: `session.markPaid`, `markComplimentary`, `close`, `getOwnerTimeline`, `getOwnerWorkspace`.

Not gated: `session.getActiveByTable`, `session.getByToken`.

Table CRUD is **not** this key (`smartQr`).
