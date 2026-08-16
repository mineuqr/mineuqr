# INVARIANTS

- I-POS-ACCESS-01 Terminal accessed only in its owning restaurant.
- I-POS-ACCESS-02 Authenticated user must have restaurant POS scope first.
- I-POS-ACCESS-03 Operational access requires an `active` terminal.
- I-POS-ACCESS-04 Access respects Effective POS Entitlement.
- I-POS-ACCESS-05 Access requires the explicit POS permission.
- I-POS-ACCESS-06 Client-supplied permissions do not grant authorization.
- I-POS-ACCESS-07 Owner/admin/PLATFORM_OWNER do not silently become cashier.
- I-POS-ACCESS-08 Operational Device is not POS Terminal identity.
- I-POS-ACCESS-09 No second authentication system.
- I-POS-ACCESS-10 No second financial authorization path.
- I-POS-ACCESS-11 `order.settlePaid` is not POS cashier authorization.
- I-POS-ACCESS-12 Access is server-authoritative.
- I-POS-ACCESS-13 Cross-restaurant terminal access is denied.
- I-POS-ACCESS-14 Missing POS entitlement does not fail open.
