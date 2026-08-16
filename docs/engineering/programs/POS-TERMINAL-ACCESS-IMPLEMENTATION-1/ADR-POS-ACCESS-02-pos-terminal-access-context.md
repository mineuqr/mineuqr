# ADR-POS-ACCESS-02: POS Terminal Access Context

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-TERMINAL-ACCESS-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

`resolvePosTerminalAccess` is the canonical server decision. It returns `PosAccessContext` only when restaurant scope, terminal ownership, active lifecycle, entitlement availability, and the required permission all pass. The POS Terminal id remains canonical.
