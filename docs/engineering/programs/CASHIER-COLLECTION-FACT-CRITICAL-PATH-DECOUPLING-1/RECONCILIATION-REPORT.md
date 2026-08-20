# RECONCILIATION-REPORT

| Certified program | This program |
|---|---|
| Collection Fact contract / execution | Consumed, not rewritten |
| Union production authority | Unchanged overlap |
| Cashier adoption | Still the only CF Confirm path; HTTP no longer waits on ST/OS/SR |
| Boundary decision OPTION A | Implemented |

Diagram vs code:

Approved: CF → COMMITTED → PAID → HTTP → ST/OS/SR.

Code: CF hook success = COMMITTED/PAID (opsLog + POS `resultFrom.outcome: "paid"`). HTTP returns. Downstream Check PAID write + ST + OS + SR.

Check outcome may still be OPEN at HTTP return. POS treats OPEN as eligible after successful Confirm so Check PAID cannot block HTTP. Financial PAID is CF, not `operational_checks.outcome`. That matches the boundary decision.
