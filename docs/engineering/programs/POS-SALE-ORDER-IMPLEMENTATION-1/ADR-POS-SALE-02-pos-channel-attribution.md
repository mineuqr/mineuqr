# ADR-POS-SALE-02: POS Channel Attribution

| Field | Value |
|---|---|
| **Status** | Accepted (program-local) |
| **Program** | POS-SALE-ORDER-IMPLEMENTATION-1 |
| **Date** | 2026-08-16 |

## Decision

Stamp only new direct POS Sales with registry channel `cashier_pos`. Partition Business Identity with existing `identityScope = POS` so POS does not share the Kiosk sequence.

## Rejected

| Alternative | Why |
|-------------|-----|
| Infer channel from terminal or cashier | Channel is not identity of actor/device |
| Reuse Kiosk sequence for station/counter | Would mix POS and Kiosk numbering |
| Rewrite Table/QR when a cashier handles it | Breaks historical channel identity |
