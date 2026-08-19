# Ordering Invariants (OI-*)

| Field | Value |
|---|---|
| **Status** | Normative |
| **Owner** | Architecture Authority |
| **Scope** | Ordering Platform · Ordering Client Platform · ordering channels (QR / Kiosk / Waiter / future) |
| **Prefix** | `OI-*` |
| **Related** | [ADR-ARCH-018](../adrs/ADR-ARCH-018-ordering-client-platform.md) · [ORDERING-PLATFORM-ARCHITECTURE-1](../../engineering/programs/ORDERING-PLATFORM-ARCHITECTURE-1/ARCHITECTURE.md) · [SELF-ORDERING-KIOSK-ARCHITECTURE-1](../../engineering/programs/SELF-ORDERING-KIOSK-ARCHITECTURE-1/ARCHITECTURE.md) |

Normative catalog of **Ordering Invariants**. Financial Settlement invariants remain `I-FIN-*` / `SR-INV-*` / `I-OS-*` under their ADRs and are **not** duplicated here. Payment process invariants remain `I-PAY-*` under [ADR-ARCH-037](../adrs/ADR-ARCH-037-payment-process-domain.md) and are **not** duplicated here. Financial Custody invariants remain `FC-INV-*` / `CR-INV-*` / `RRS-INV-*` under ADR-ARCH-028 / 030 / 033 and are **not** duplicated here.

---

## Runtime / Client Journey

### OI-RT-01 — Runtime Identity Continuity

Within a single customer ordering journey, `deviceSessionId` MUST remain immutable.

Navigation MUST NOT create a new runtime identity.

Only the following events may rotate the identity:

- Start New Order
- Explicit Journey Reset
- Idle Timeout

**Applies to:** Kiosk (and any channel whose CartScope encodes a journey device/session id).  
**Survives:** Browse → Cart → Checkout → Payment → Confirmation.  
**Evidence / implementation:** ADR-ARCH-018 Decision §6 · SELF-ORDERING-RUNTIME-IDENTITY-FIX-1 · `kioskDeviceSessionIdentity.ts`.

---

## Registry notes

| ID | Title | Status |
|----|-------|--------|
| OI-RT-01 | Runtime Identity Continuity | **In force** |

New Ordering Invariants MUST be added here with a stable `OI-<area>-NN` id before channel programs treat them as optional.
