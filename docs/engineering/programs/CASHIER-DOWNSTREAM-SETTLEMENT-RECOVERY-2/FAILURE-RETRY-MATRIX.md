# FAILURE-RETRY-MATRIX

| Failure | Financial CF | HTTP / UI | Downstream |
|---|---|---|---|
| ST insert fails after CF | unchanged | already SUCCESS if HTTP returned | pending; cron retries |
| OS/SR fail | unchanged | SUCCESS | pending; cron retries |
| Check PAID write fails (OPEN remains) | unchanged | SUCCESS | OPEN+CF still selected by sweep |
| HTTP timeout after CF | unchanged | unknown-result recovery → **PAID** if `financiallyPaid` | cron/replay |
| Cron unauthorized | unchanged | n/a | sweep skipped (401) |
| Second Confirm, new identities, same order | **replay existing CF** | paid, `replayed: true` | schedule recovery |
| Same paymentIntentId + idempotencyKey | replay | paid | schedule recovery |

Never: SR/ST/OS/Check-PAID failure → financial unpaid.
