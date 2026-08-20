# DEPENDENCY-RECONCILIATION

| Component | Critical path | Downstream | Intact |
|---|---|---|---|
| Collection Fact | Yes (authority) | No | Yes |
| Check freeze / OPEN persist | Yes (fact input + checkId) | — | Yes |
| Check PAID write | No | Yes | Yes |
| ST | No | Yes | Yes |
| OS pending on enroll | Yes (materialize) | OS **settled** after HTTP | Yes |
| SR | No | Yes | Yes |
| Attribution | No | After SR in downstream finalize | Yes |
| Union | No | Read-time | Yes |

OS pending insert during materialize remains **before** CF because enrollment is part of freeze composition. OS **settled** is after HTTP.

Refund/print/CRMP still consume SR/ST/Check PAID after they exist. No deletion.
