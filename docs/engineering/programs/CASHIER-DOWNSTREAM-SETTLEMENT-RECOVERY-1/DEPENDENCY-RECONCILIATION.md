# DEPENDENCY-RECONCILIATION

| Component | Role |
|---|---|
| Collection Fact | Financial authority. Read by recovery for tenders/identity. Never updated/deleted. |
| Check freeze | Durable obligation half after HTTP |
| Check PAID / ST / OS / SR | Downstream; filled by recovery |
| Print / refund / CRMP | Still consume SR; UI rediscovers; recovery creates SR after HTTP |
| Revenue Union | Unchanged; CF wins overlap |
| Session / Waiter / Kiosk / QR / Counter | Unchanged |

Print/refund do not wait on Cashier HTTP. If SR is missing, `settlementRecord.getByCheck` remains empty until recovery completes. That is readiness lag, not a restored critical path.
