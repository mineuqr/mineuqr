# LEGACY-DEPENDENCY-CLASSIFICATION

| Operation | Class |
|---|---|
| Collection Fact create/replay | **REQUIRED BEFORE COMMIT** (financial) |
| Check freeze / materialize | **REQUIRED BEFORE COMMIT** (CF money input) |
| Check PAID write | **REQUIRED AFTER COMMIT** / **RECOVERY ONLY** on Vercel |
| ST | **REQUIRED AFTER COMMIT** (tender mix / refund). Not Gross. |
| OS settled | **REQUIRED AFTER COMMIT**. Not Gross. |
| SR | **REQUIRED AFTER COMMIT** (print/refund/CRMP). Not Gross. |
| `settlementRecord.getByCheck` after Confirm | **LEGACY BUT STILL CONSUMED** — **blocks toast**, not HTTP |
| Print | **REQUIRED AFTER COMMIT** if SR id present |
| Refund | **LEGACY BUT STILL CONSUMED** — needs SR/Check PAID |
| CRMP register/shift resolve | **REQUIRED BEFORE COMMIT** (HTTP) |
| POS idempotency store | **KEEP** / **REQUIRED AFTER COMMIT** for HTTP — `await put` still on the Confirm HTTP path; also schedules recovery on replay |
| UI `invalidateOrderReads` | **KEEP** presentation |
| Recovery `Check OPEN` ⇒ unpaid | **LEGACY BUT STILL CONSUMED** — **wrong after decoupling** |
| Vercel recovery worker | **RECOVERY ONLY** — **not active** |
| Revenue Union | **REPORTING ONLY** |
| HTTP 200 | Transport, not financial authority |
