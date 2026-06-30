# PRINT-UX-2 — Session Card (Section 2)

**Component:** `ConnectorSessionCard.tsx`

---

## Fields

| Field | Source |
|-------|--------|
| Session state | `sessionState` badge |
| Authentication | `authentication` |
| Registration | `registration` |
| Transport | `transport` (e.g. Connector Session · Local Desktop) |
| Connected since | `connectedSince` |
| Last activity | `lastActivityAt` |

---

## ADR Alignment

Reflects **Connector Session SSOT** (ADR-ARCH-016 Rule 9) without exposing session protocol internals.
