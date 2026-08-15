# AUDIT

Existing `emitAuditEvent` / `OPS_EVENT` taxonomy. No second audit system.

## Events

| Event | Action |
|-------|--------|
| `commercial_concession_granted` | grant / free-first persist |
| `commercial_concession_revised` | revise / extend / shorten |
| `commercial_concession_cancelled` | cancel |

## Payload

- `actorId`
- `targetType: subscription`
- `targetId: subscriptionId`
- `before`: prior id/status/unit/duration/endsAt/version (null on first grant)
- `after`: new id/status/unit/duration/endsAt/version/reason
- `metadata.action` + `metadata.source`
- `reason` on the concession row and in `after`

Audit failure must not reverse a successful persist.
